let originalHtmlCode = '';
let currentHtmlCode = '';
let uploadedFileContent = '';
let rawUploadedFileContent = '';
let codeEditor = null;

// Tab switching for preview section
function switchTab(tabName, clickedElement) {
    // Hide only preview section tab contents
    document.querySelectorAll('#preview-tab, #code-tab').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from preview area tabs only
    document.querySelectorAll('.preview-area .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked tab
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
    
    // Initialize CodeMirror when switching to code tab
    if (tabName === 'code') {
        setTimeout(initializeCodeEditor, 50);
    }
}

// Input method tab switching
function switchInputTab(tabName, clickedElement) {
    // Hide only input section tab contents
    document.querySelectorAll('#structured-input, #raw-input').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from sidebar tabs only
    document.querySelectorAll('.sidebar .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected input tab content
    document.getElementById(tabName + '-input').classList.add('active');
    
    // Add active class to clicked tab
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
}

// Show message
function showMessage(message, type = 'error') {
    const container = document.getElementById('messageContainer');
    container.innerHTML = `<div class="${type}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// File upload handlers
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        extractTextFromFile(file, 'structured');
    }
}

function handleRawFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        extractTextFromFile(file, 'raw');
    }
}

// Extract text from uploaded file
async function extractTextFromFile(file, type) {
    const fileInfo = type === 'structured' ? 'fileInfo' : 'rawFileInfo';
    const fileName = type === 'structured' ? 'fileName' : 'rawFileName';
    const fileSize = type === 'structured' ? 'fileSize' : 'rawFileSize';
    
    // Show file info
    document.getElementById(fileName).textContent = `파일명: ${file.name}`;
    document.getElementById(fileSize).textContent = `크기: ${(file.size / 1024).toFixed(2)} KB`;
    document.getElementById(fileInfo).style.display = 'block';

    try {
        let text = '';
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'txt' || fileExtension === 'md') {
            text = await readTextFile(file);
        } else if (fileExtension === 'pdf') {
            text = await readPDFFile(file);
        } else if (fileExtension === 'doc' || fileExtension === 'docx') {
            text = await readDocFile(file);
        } else {
            throw new Error('지원하지 않는 파일 형식입니다.');
        }

        if (type === 'structured') {
            uploadedFileContent = text;
        } else {
            rawUploadedFileContent = text;
        }

        showMessage('파일이 성공적으로 업로드되었습니다.', 'success');
    } catch (error) {
        console.error('File reading error:', error);
        showMessage(`파일 읽기 오류: ${error.message}`, 'error');
    }
}

// Read text file
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('파일 읽기 실패'));
        reader.readAsText(file, 'UTF-8');
    });
}

// Read PDF file using PDF.js
async function readPDFFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText.trim());
            } catch (error) {
                reject(new Error('PDF 파일 읽기 실패: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
    });
}

// Read DOC/DOCX file using mammoth.js
async function readDocFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
                resolve(result.value);
            } catch (error) {
                reject(new Error('문서 파일 읽기 실패: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
    });
}

// Remove uploaded file
function removeFile() {
    document.getElementById('fileUpload').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    uploadedFileContent = '';
    showMessage('파일이 제거되었습니다.', 'success');
}

function removeRawFile() {
    document.getElementById('rawFileUpload').value = '';
    document.getElementById('rawFileInfo').style.display = 'none';
    rawUploadedFileContent = '';
    showMessage('파일이 제거되었습니다.', 'success');
}

// Generate estimate using AI (structured input)
async function generateEstimate() {
    const apiKey = window.CONFIG?.OPENAI_API_KEY;
    if (!apiKey) {
        showMessage('API 키가 설정되지 않았습니다. config.js 파일을 확인해주세요.', 'error');
        return;
    }

    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const clientName = document.getElementById('clientName').value.trim() || '고객사';
    const budget = document.getElementById('budget').value;
    console.log('Budget input value:', budget);
    const timeline = document.getElementById('timeline').value.trim() || '협의';
    const additionalRequirements = document.getElementById('additionalRequirements').value.trim();
    const aiPrompt = document.getElementById('aiPrompt').value.trim();

    if (!projectName || !projectDescription) {
        showMessage('프로젝트명과 프로젝트 설명은 필수 항목입니다.', 'error');
        return;
    }

    // Show loading
    document.getElementById('loading').classList.add('show');
    document.getElementById('messageContainer').innerHTML = '';

    try {
        // Load template
        let templateHtml = '';
        try {
            const response = await fetch('견적서_템플릿.html');
            templateHtml = await response.text();
        } catch (error) {
            console.error('템플릿 로드 실패:', error);
        }

        // Generate estimate using partial replacement
        const generatedHtml = await generateEstimateWithPartialReplacement(
            apiKey, 
            projectName, 
            projectDescription, 
            clientName, 
            budget, 
            timeline, 
            additionalRequirements, 
            aiPrompt, 
            uploadedFileContent, 
            templateHtml
        );

        // Store original code
        originalHtmlCode = generatedHtml;
        currentHtmlCode = generatedHtml;

        // Update preview
        updatePreviewFromCode(generatedHtml);
        
        // Update code editor
        if (codeEditor) {
            codeEditor.setValue(generatedHtml);
        } else {
            document.getElementById('htmlCodeEditor').value = generatedHtml;
        }

        showMessage('견적서가 성공적으로 생성되었습니다!', 'success');

    } catch (error) {
        console.error('Error:', error);
        showMessage(`오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        document.getElementById('loading').classList.remove('show');
    }
}

// Generate estimate using AI (raw data input)
async function generateEstimateFromRaw() {
    const apiKey = window.CONFIG?.OPENAI_API_KEY;
    if (!apiKey) {
        showMessage('API 키가 설정되지 않았습니다. config.js 파일을 확인해주세요.', 'error');
        return;
    }

    const rawData = document.getElementById('rawData').value.trim();
    const rawAiPrompt = document.getElementById('rawAiPrompt').value.trim();

    if (!rawData) {
        showMessage('원시 데이터를 입력해주세요.', 'error');
        return;
    }

    // Show loading
    document.getElementById('loading').classList.add('show');
    document.getElementById('messageContainer').innerHTML = '';

    try {
        // Load template
        let templateHtml = '';
        try {
            const response = await fetch('견적서_템플릿.html');
            templateHtml = await response.text();
        } catch (error) {
            console.error('템플릿 로드 실패:', error);
        }

        // Extract project information from raw data using AI
        const projectInfo = await extractProjectInfoFromRaw(apiKey, rawData, rawAiPrompt, rawUploadedFileContent);
        console.log('Extracted project info:', projectInfo);
        
        // 프로젝트명이 없을 경우 기본값 설정
        const projectName = projectInfo.projectName || projectInfo.projectDescription?.split('.')[0]?.substring(0, 50) || '프로젝트';
        const clientName = projectInfo.clientName || '고객사';
        const projectDescription = projectInfo.projectDescription || rawData.substring(0, 500);
        
        console.log('Processed project info:');
        console.log('Project name:', projectName);
        console.log('Client name:', clientName);
        
        // Generate estimate using partial replacement
        const generatedHtml = await generateEstimateWithPartialReplacement(
            apiKey, 
            projectName, 
            projectDescription, 
            clientName, 
            projectInfo.budget, 
            projectInfo.timeline, 
            projectInfo.additionalRequirements, 
            rawAiPrompt, 
            rawUploadedFileContent, 
            templateHtml,
            projectInfo.packageBudgets
        );

        // Store original code
        originalHtmlCode = generatedHtml;
        currentHtmlCode = generatedHtml;

        // Update preview
        updatePreviewFromCode(generatedHtml);
        
        // Update code editor
        if (codeEditor) {
            codeEditor.setValue(generatedHtml);
        } else {
            document.getElementById('htmlCodeEditor').value = generatedHtml;
        }

        showMessage('견적서가 성공적으로 생성되었습니다!', 'success');

    } catch (error) {
        console.error('Error:', error);
        showMessage(`오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        document.getElementById('loading').classList.remove('show');
    }
}

// Extract project information from raw data using AI
async function extractProjectInfoFromRaw(apiKey, rawData, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 프로젝트 정보 추출 전문가입니다. 주어진 원시 데이터를 분석하여 견적서 작성에 필요한 정보를 추출해주세요.

추출할 정보:
1. 프로젝트명 (반드시 추출해야 함 - 명시되지 않은 경우 프로젝트 설명의 첫 문장이나 핵심 키워드를 활용하여 적절한 프로젝트명 생성)
2. 프로젝트 설명 (상세한 설명)
3. 클라이언트명 (명시되지 않은 경우 "고객사"로 설정)
4. 개발 기간 (예: 3개월, 6개월 등)
5. 추가 요구사항
6. 패키지별 예산 정보 (기본형, 표준형, 프리미엄형 패키지의 예산)

중요 규칙:
- 프로젝트명은 반드시 추출해야 하며, null이 될 수 없습니다
- 프로젝트명이 명시되지 않은 경우, 프로젝트 설명을 분석하여 적절한 프로젝트명을 생성하세요
- 예: "카카오톡 자동 질문 분석 시스템", "AI 기반 고객 문의 관리 플랫폼" 등
- 프로젝트명은 2-30자 정도의 간결하고 명확한 이름으로 생성하세요

패키지 예산 추출 규칙:
- "기본형이 1000만원", "표준형 3000만원", "프리미엄형 5000만원" 등의 패턴을 찾아서 추출
- 패키지명과 금액이 함께 언급된 경우만 추출
- 만원 단위로 표시된 금액을 그대로 사용 (예: 3000만원 → 30000000)
- 패키지별 예산이 명시되지 않으면 null로 설정

JSON 형식으로 응답해주세요:
{
  "projectName": "프로젝트명 (반드시 제공, null 불가)",
  "projectDescription": "상세한 프로젝트 설명",
  "clientName": "클라이언트명",
  "budget": "전체예산또는null",
  "timeline": "개발기간",
  "additionalRequirements": "추가요구사항",
  "packageBudgets": {
    "basic": "기본형예산또는null",
    "standard": "표준형예산또는null", 
    "premium": "프리미엄형예산또는null"
  }
}`;

    const userPrompt = `원시 데이터:
${rawData}

${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 원시 데이터에서 견적서 작성에 필요한 정보를 추출해주세요.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    const projectInfo = JSON.parse(response);
    
    // 프로젝트명이 null, undefined, 또는 문자열 "null"인 경우 처리
    if (!projectInfo.projectName || projectInfo.projectName === 'null' || projectInfo.projectName.trim() === '') {
        // 프로젝트 설명에서 프로젝트명 생성 시도
        if (projectInfo.projectDescription) {
            const desc = projectInfo.projectDescription.trim();
            // 첫 문장이나 핵심 키워드 추출
            const firstSentence = desc.split('.')[0].trim();
            if (firstSentence.length > 0 && firstSentence.length <= 50) {
                projectInfo.projectName = firstSentence;
            } else {
                // 설명이 너무 길면 앞부분만 사용
                projectInfo.projectName = desc.substring(0, 30).trim();
            }
        } else {
            projectInfo.projectName = '프로젝트';
        }
        console.log('⚠️ 프로젝트명이 없어서 자동 생성:', projectInfo.projectName);
    }
    
    // 클라이언트명도 동일하게 처리
    if (!projectInfo.clientName || projectInfo.clientName === 'null' || projectInfo.clientName.trim() === '') {
        projectInfo.clientName = '고객사';
    }
    
    return projectInfo;
}

// Partial replacement functions for each section
async function generateEstimateWithPartialReplacement(apiKey, projectName, projectDescription, clientName, budget, timeline, additionalRequirements, aiPrompt, uploadedFileContent, templateHtml, packageBudgets = null) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
    
    // Calculate project dates
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 7); // 1주일 후 시작
    const startDateStr = `${startDate.getFullYear()}년 ${String(startDate.getMonth() + 1).padStart(2, '0')}월 ${String(startDate.getDate()).padStart(2, '0')}일`;
    
    // Parse timeline to calculate end date
    let endDateStr = '';
    if (timeline) {
        const months = timeline.match(/(\d+)개월/);
        if (months) {
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + parseInt(months[1]));
            endDateStr = `${endDate.getFullYear()}년 ${String(endDate.getMonth() + 1).padStart(2, '0')}월 ${String(endDate.getDate()).padStart(2, '0')}일`;
        }
    } else {
        // Default timeline for complex app development (6 months)
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6);
        endDateStr = `${endDate.getFullYear()}년 ${String(endDate.getMonth() + 1).padStart(2, '0')}월 ${String(endDate.getDate()).padStart(2, '0')}일`;
    }
    
    // Calculate budget if provided
    let totalAmount = 0;
    let subTotal = 0;
    let vat = 0;
    
    if (budget && !isNaN(parseInt(budget))) {
        // Extract number from budget string
        const budgetMatch = budget.match(/(\d+)/);
        if (budgetMatch) {
            subTotal = parseInt(budgetMatch[1]);
            // 예산이 100만원 미만이면 만원 단위로 해석
            if (subTotal < 1000000) {
                subTotal = subTotal * 10000; // 만원 단위로 변환
            }
            vat = Math.round(subTotal * 0.1); // VAT 계산 (10%)
            totalAmount = subTotal + vat; // VAT 포함 총 금액
            
            console.log('Budget calculation for project info:');
            console.log('Original budget:', budget);
            console.log('Sub total (VAT 제외):', subTotal);
            console.log('VAT:', vat);
            console.log('Total amount (VAT 포함):', totalAmount);
        } else {
            // No budget provided - let AI generate appropriate amounts
            subTotal = 0;
            vat = 0;
            totalAmount = 0;
            
            console.log('No budget provided - AI will generate appropriate amounts based on project analysis');
        }
    } else {
        // No budget provided - let AI generate appropriate amounts
        subTotal = 0;
        vat = 0;
        totalAmount = 0;
        
        console.log('No budget provided - AI will generate appropriate amounts based on project analysis');
    }
    
    // Format amounts
    const formatAmount = (amount) => {
        return amount.toLocaleString('ko-KR') + '원';
    };
    
    // 먼저 costTableData를 생성하여 subTotal을 계산
    console.log('🚀 병렬 AI API 호출 시작...');
    const startTime = Date.now();
    
    const [
        costTableData,
        overviewText,
        timelineData
    ] = await Promise.all([
        generateCostTableData(apiKey, projectName, projectDescription, budget, additionalRequirements, aiPrompt, uploadedFileContent),
        generateProjectOverview(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent),
        generateTimelineData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent, packageBudgets)
    ]);
    
    // If no budget provided, calculate from AI-generated amounts
    if (subTotal === 0) {
        const calculatedSubTotal = costTableData.items.reduce((sum, item) => {
            const amount = parseInt(item.amount.replace(/[^\d]/g, ''));
            return sum + amount;
        }, 0);
        
        subTotal = calculatedSubTotal;
        vat = Math.round(subTotal * 0.1);
        totalAmount = subTotal + vat;
        
        console.log('AI generated budget calculation:');
        console.log('Sub total (VAT 제외):', subTotal);
        console.log('VAT:', vat);
        console.log('Total amount (VAT 포함):', totalAmount);
    }
    
    // 이제 subTotal과 totalAmount가 계산되었으므로 패키지 데이터 생성
    const packageData = await generatePackageData(apiKey, projectName, projectDescription, clientName, budget, additionalRequirements, aiPrompt, uploadedFileContent, subTotal, totalAmount, packageBudgets);
    
    const endTime = Date.now();
    console.log(`⚡ 병렬 처리 완료: ${endTime - startTime}ms`);
    
    // Now format amounts with correct values
    let totalAmountFormatted = formatAmount(totalAmount);
    let subTotalFormatted = formatAmount(subTotal);
    let vatFormatted = formatAmount(vat);
    
    // Replace basic project info
    // 프로젝트명이 null이거나 빈 값인 경우 기본값 설정
    const safeProjectName = projectName && projectName !== 'null' && projectName.trim() !== '' 
        ? projectName.trim() 
        : '프로젝트';
    const safeClientName = clientName && clientName !== 'null' && clientName.trim() !== '' 
        ? clientName.trim() 
        : '고객사';
    
    let html = templateHtml
        .replace(/\[날짜\]/g, todayStr)
        .replace(/\[프로젝트명\]/g, safeProjectName)
        .replace(/\[클라이언트명\]/g, safeClientName)
        .replace(/일금 \[총액\]\(총액 \/ V\.A\.T 별도\)/g, `일금 ${totalAmountFormatted}(총액 / V.A.T 별도)`)
        .replace(/\[일정\]/g, endDateStr ? `${startDateStr} ~ ${endDateStr}` : '협의');
    
    // Replace project overview
    const overviewRegex = /<p style="font-size: 15px; color: #333; margin: 15px 0;">[\s\S]*?<\/p>/g;
    html = html.replace(overviewRegex, `<p style="font-size: 15px; color: #333; margin: 15px 0;">${overviewText}</p>`);
    
    console.log('Project overview replacement:');
    console.log('Original description:', projectDescription);
    console.log('Overview text to replace:', overviewText);
    
    // Replace development cost table
    html = replaceCostTable(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal);
    
    // Replace package options
    console.log('Package data:', packageData);
    html = replacePackageOptions(html, packageData);
    
    // Update project info with actual timeline from AI
    const actualStartDate = timelineData.stages[0]?.period?.split(' ~ ')[0];
    const actualEndDate = timelineData.stages[timelineData.stages.length - 1]?.period?.split(' ~ ')[1];
    
    if (actualStartDate && actualEndDate) {
        // Convert MM/DD format to YYYY년 MM월 DD일 format with proper year handling
        const currentYear = new Date().getFullYear();
        const startMonth = parseInt(actualStartDate.split('/')[0]);
        const startDay = actualStartDate.split('/')[1];
        const endMonth = parseInt(actualEndDate.split('/')[0]);
        const endDay = actualEndDate.split('/')[1];
        
        // Handle year rollover - if end month is before start month, assume next year
        let startYear = currentYear;
        let endYear = currentYear;
        
        if (endMonth < startMonth) {
            endYear = currentYear + 1;
        }
        
        const actualStartDateStr = `${startYear}년 ${String(startMonth).padStart(2, '0')}월 ${String(startDay).padStart(2, '0')}일`;
        const actualEndDateStr = `${endYear}년 ${String(endMonth).padStart(2, '0')}월 ${String(endDay).padStart(2, '0')}일`;
        
        // Update the project info with actual timeline
        html = html.replace(/\d{4}년 \d{2}월 \d{2}일 ~ \d{4}년 \d{2}월 \d{2}일/g, `${actualStartDateStr} ~ ${actualEndDateStr}`);
        
        console.log('Updated project timeline:');
        console.log('Actual start date:', actualStartDateStr);
        console.log('Actual end date:', actualEndDateStr);
    }
    
    // Replace timeline
    html = replaceTimeline(html, timelineData);
    
    // Replace payment terms with proper structure (VAT 포함 금액 기준)
    const paymentAmount = Math.round(totalAmount / 2);
    const paymentTableBody = `
        <tr>
            <td>계약금</td>
            <td>50%</td>
            <td>${formatAmount(paymentAmount)}</td>
            <td>계약 체결 시</td>
        </tr>
        <tr>
            <td>잔금</td>
            <td>50%</td>
            <td>${formatAmount(paymentAmount)}</td>
            <td>최종 개발 완료 및 검수 후</td>
        </tr>`;
    
    // Replace payment table - more specific targeting
    const paymentTableRegex = /<div class="estimate-section-title">결제 조건<\/div>[\s\S]*?<table class="estimate-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(paymentTableRegex, (match) => {
        return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${paymentTableBody}</tbody>`);
    });
    
    return html;
}

// Generate cost table data using AI
async function generateCostTableData(apiKey, projectName, projectDescription, budget, additionalRequirements, aiPrompt, uploadedFileContent) {
    // Calculate subTotal for cost distribution
    let subTotal = 0;
    if (budget) {
        // Extract number from budget string (e.g., "예산 3000만원" -> 30000000)
        const budgetMatch = budget.match(/(\d+)/);
        if (budgetMatch) {
            let totalAmount = parseInt(budgetMatch[1]);
            if (totalAmount < 1000000) {
                totalAmount = totalAmount * 10000; // 만원 단위로 변환
            }
            // budget이 이미 VAT 제외 금액인지 확인
            if (budget.includes('만원') || budget.includes('원')) {
                // 이미 원화 단위로 표시된 경우 VAT 제외 금액으로 간주
                subTotal = totalAmount;
            } else {
                // 숫자만 있는 경우 VAT 제외 금액으로 간주
                subTotal = totalAmount;
            }
            console.log('Budget calculation for cost distribution:');
            console.log('Original budget:', budget);
            console.log('Extracted amount:', totalAmount);
            console.log('Sub total (VAT 제외):', subTotal);
        } else {
            // No budget provided - AI will generate appropriate amounts
            subTotal = 0;
            console.log('No budget provided - AI will generate appropriate amounts based on project analysis');
        }
    } else {
        // No budget provided - AI will generate appropriate amounts
        subTotal = 0;
        console.log('No budget provided - AI will generate appropriate amounts based on project analysis');
    }

    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 개발 비용 테이블의 7개 항목을 생성해주세요.

규칙:
1. 정확히 7개의 항목만 생성
2. 각 항목은 Contents, Type, Amount로 구성
3. Type은 Planning, Frontend, Backend, AI/ML, Integration, Feature, Database, QA 중 하나
4. Amount는 원화로 표시 (예: 1,500,000원)
5. 모든 금액은 반드시 양수여야 함 (음수 금액 절대 금지)
6. QA 및 테스트 항목은 반드시 양수 금액으로 설정 (최소 1,000,000원 이상)
7. 음수 금액이 생성되면 즉시 1,000,000원으로 수정
8. 프로젝트의 복잡도와 규모를 분석하여 현실적인 가격으로 설정
9. AI 기능, 모바일 앱, 웹앱, 결제 시스템 등 기술적 복잡도 고려
10. 교육 앱의 경우 사용자 경험과 안정성이 중요하므로 적절한 QA 비용 포함
11. 모든 금액의 합계가 일관성 있게 설정되어야 함
12. JSON 형식으로 응답

가격 설정 가이드:
- 단순한 웹사이트: 500-2000만원
- 모바일 앱: 1000-5000만원
- AI 기능 포함 앱: 2000-8000만원
- 복합 플랫폼 (웹+모바일+AI): 3000-10000만원

응답 형식:
{
  "items": [
    {"contents": "항목명", "type": "Type", "amount": "1,500,000원"},
    ...
  ]
}`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
클라이언트명: ${clientName}
예상 예산: ${budget ? budget : '협의'}
${subTotal > 0 ? `\n중요: 총 예산은 ${subTotal.toLocaleString('ko-KR')}원(VAT 제외)입니다. 이 금액에 맞춰 7개 항목의 비용을 배분해주세요.` : ''}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 개발 비용 테이블의 7개 항목을 생성해주세요. ${subTotal > 0 ? `모든 금액의 합계가 정확히 ${subTotal.toLocaleString('ko-KR')}원이 되도록 조정해주세요.` : '프로젝트 규모와 복잡도에 맞는 적절한 금액으로 구성해주세요.'}

중요: 모든 금액은 반드시 양수여야 합니다. 음수 금액은 절대 생성하지 마세요. QA 항목은 최소 1,000,000원 이상으로 설정하세요.

예시 (올바른 형식):
- "1,500,000원" ✅
- "2,000,000원" ✅
- "-1,000,000원" ❌ (절대 금지)
- "1,000,000원" ✅ (QA 최소 금액)`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    const costData = JSON.parse(response);
    
    // Validate and adjust amounts to match subTotal
    const totalAmount = costData.items.reduce((sum, item) => {
        const amount = parseInt(item.amount.replace(/[^\d]/g, ''));
        return sum + amount;
    }, 0);
    
    if (totalAmount !== subTotal) {
        // Adjust the last item to match subTotal
        const adjustment = subTotal - totalAmount;
        const lastItem = costData.items[costData.items.length - 1];
        const lastAmount = parseInt(lastItem.amount.replace(/[^\d]/g, ''));
        const newAmount = lastAmount + adjustment;
        lastItem.amount = newAmount.toLocaleString('ko-KR') + '원';
    }
    
    return costData;
}

// Generate package data using AI
async function generatePackageData(apiKey, projectName, projectDescription, clientName, budget, additionalRequirements, aiPrompt, uploadedFileContent, subTotal, totalAmount, packageBudgets = null) {
    const formatAmount = (amount) => {
        return amount.toLocaleString('ko-KR') + '원';
    };
    
    // Calculate subTotal if not provided (for parallel processing)
    if (subTotal === 0 && budget) {
        const budgetMatch = budget.match(/(\d+)/);
        if (budgetMatch) {
            let budgetAmount = parseInt(budgetMatch[1]);
            if (budgetAmount < 1000000) {
                budgetAmount = budgetAmount * 10000; // 만원 단위로 변환
            }
            subTotal = budgetAmount;
            totalAmount = subTotal + Math.round(subTotal * 0.1); // VAT 포함
        }
    }

    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 3개의 패키지 옵션을 생성해주세요.

중요 규칙:
1. 기본형, 표준형, 프리미엄형 3개 패키지
2. 기본형: 5개 기능 (기본적인 기능만)
3. 표준형: 7개 기능 (기본형 + 고급 기능 2개 추가)
4. 프리미엄형: 9개 기능 (표준형 + 프리미엄 기능 2개 추가)
5. 각 패키지는 서로 다른 수준의 기능을 제공해야 함 (중복 최소화)
6. 가격은 반드시 기본형 < 표준형 < 프리미엄형 순으로 설정
7. 프로젝트 설명을 분석하여 적절한 플랫폼 유형을 판단하세요 (웹사이트, 모바일앱, 데스크톱앱, AI시스템 등)
8. 기능 설명은 프로젝트 유형에 맞게 구체적이고 명확하게 작성하세요
9. JSON 형식으로 응답

가격 설정 규칙:
${packageBudgets && packageBudgets.basic ? `- 기본형: ${parseInt(packageBudgets.basic).toLocaleString('ko-KR')}원 (지정된 가격)` : totalAmount > 0 ? `- 기본형: Total Amount의 40-50% (${Math.round(totalAmount * 0.45).toLocaleString('ko-KR')}원)` : `- 기본형: 프로젝트 복잡도에 맞는 기본 가격`}
${packageBudgets && packageBudgets.standard ? `- 표준형: ${parseInt(packageBudgets.standard).toLocaleString('ko-KR')}원 (지정된 가격)` : totalAmount > 0 ? `- 표준형: Total Amount의 100% (${totalAmount.toLocaleString('ko-KR')}원) - 반드시 이 금액과 정확히 일치해야 합니다!` : `- 표준형: 기본형보다 1.5-2배 높은 가격`}
${packageBudgets && packageBudgets.premium ? `- 프리미엄형: ${parseInt(packageBudgets.premium).toLocaleString('ko-KR')}원 (지정된 가격)` : totalAmount > 0 ? `- 프리미엄형: Total Amount의 150-200% (${Math.round(totalAmount * 1.75).toLocaleString('ko-KR')}원)` : `- 프리미엄형: 프로젝트 전체 예산에 맞는 가격`}

CRITICAL: 
- 표준형 패키지 가격은 반드시 Total Amount (${totalAmount > 0 ? totalAmount.toLocaleString('ko-KR') + '원' : '계산된 총액'})와 정확히 일치해야 합니다!
- 가격은 반드시 기본형 < 표준형 < 프리미엄형 순이어야 합니다!

응답 형식:
{
  "packages": [
    {
      "name": "기본형 패키지",
      "price": "가격원",
      "features": ["기능1", "기능2", ...]
    },
    ...
  ]
}`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
클라이언트명: ${clientName}
예상 예산: ${budget ? budget + '원' : '협의'}
${subTotal > 0 ? `Sub Total (VAT 제외): ${subTotal.toLocaleString('ko-KR')}원` : ''}
${totalAmount > 0 ? `Total Amount (VAT 포함): ${totalAmount.toLocaleString('ko-KR')}원` : ''}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 3개의 패키지 옵션을 생성해주세요. 
${totalAmount > 0 ? `중요: 표준형 패키지의 가격은 반드시 Total Amount인 ${totalAmount.toLocaleString('ko-KR')}원과 정확히 일치해야 합니다!` : '프로젝트 규모에 맞는 적절한 가격으로 설정하세요.'}

중요: 프로젝트 설명을 분석하여 적절한 플랫폼 유형을 판단하고, 해당 유형에 맞는 구체적이고 명확한 기능들로 패키지를 구성해주세요.`;

    // Generate package data using AI (including prices and features)
    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    const packageData = JSON.parse(response);
    
    console.log('AI generated package data:', packageData);
    
    // 표준형 패키지 가격을 totalAmount로 강제 설정
    if (totalAmount > 0 && packageData.packages && packageData.packages.length >= 2) {
        const standardPackage = packageData.packages.find(pkg => pkg.name.includes('표준형') || pkg.name.includes('표준'));
        if (standardPackage) {
            standardPackage.price = formatAmount(totalAmount);
            console.log(`✅ 표준형 패키지 가격을 Total Amount(${totalAmount.toLocaleString('ko-KR')}원)로 설정했습니다.`);
        }
    }
    
    return packageData;
}


// Generate project overview using AI
async function generateProjectOverview(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 간결하고 명확한 프로젝트 개요를 생성해주세요.

규칙:
1. 1-2개의 문장으로만 구성 (최대 2문장)
2. 자연스럽고 전문적인 문체 사용
3. 프로젝트의 핵심 목적과 특징을 간결하게 설명
4. 기술적 세부사항보다는 비즈니스 가치와 사용자 혜택 중심으로 작성
5. 견적서에 적합한 공식적인 톤 유지
6. "혁신적인", "차세대" 등 과장된 표현 사용 금지
7. 불필요한 수식어나 장황한 설명 금지

응답 형식:
문장으로만 응답하세요. JSON이나 다른 형식은 사용하지 마세요.`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 견적서에 적합한 프로젝트 개요를 자연스러운 문장 형식으로 작성해주세요.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return response.trim();
}

// Generate timeline data using AI
async function generateTimelineData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent, packageBudgets = null) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 개발 일정의 7단계를 생성해주세요.

규칙:
1. 정확히 7단계만 생성
2. 각 단계는 단계명, 주요 내용, 기간으로 구성
3. 기간은 "MM/DD ~ MM/DD" 형식 (현재 연도 기준)
4. 프로젝트 유형에 따른 개발 기간 설정:
   - 단순 웹사이트: 2-3개월
   - 일반 웹사이트: 3-4개월  
   - 모바일 앱: 4-6개월
   - AI 기능 포함 앱: 5-8개월
5. 각 단계는 2-4주 정도의 기간으로 설정
6. 전체 일정이 연도가 넘어가지 않도록 주의 (예: 10월 시작이면 다음 해 3월까지)
7. 프로젝트 설명을 분석하여 적절한 개발 기간을 설정
8. 프로젝트 규모와 예산에 맞는 현실적인 일정을 설정
9. JSON 형식으로 응답

${packageBudgets ? `패키지 예산 정보:
- 기본형: ${packageBudgets.basic ? parseInt(packageBudgets.basic).toLocaleString('ko-KR') + '원' : '미지정'}
- 표준형: ${packageBudgets.standard ? parseInt(packageBudgets.standard).toLocaleString('ko-KR') + '원' : '미지정'}
- 프리미엄형: ${packageBudgets.premium ? parseInt(packageBudgets.premium).toLocaleString('ko-KR') + '원' : '미지정'}

위 패키지 예산을 고려하여 적절한 개발 일정을 설정해주세요.` : ''}

AI 앱 개발 일정 예시 (4-6개월):
- 1단계: 기획 및 요구사항 분석 (3-4주)
- 2단계: UI/UX 디자인 및 프로토타입 (4-5주)  
- 3단계: 백엔드 시스템 개발 (4-5주)
- 4단계: AI 기능 개발 및 통합 (5-6주)
- 5단계: 프론트엔드 개발 (4-5주)
- 6단계: 통합 테스트 및 최적화 (3-4주)
- 7단계: 배포 및 런칭 (2-3주)

응답 형식:
{
  "stages": [
    {"stage": "1단계", "content": "주요 내용", "period": "10/21 ~ 11/3"},
    ...
  ]
}`;

    // 현재 날짜 정보 추가
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    
    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
클라이언트명: ${clientName}
개발 기간: ${timeline || '협의'}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 개발 일정의 7단계를 생성해주세요.

중요: 
1. 프로젝트 설명을 분석하여 적절한 개발 기간을 설정해주세요.
2. 현재 날짜는 ${currentYear}년 ${currentMonth}월 ${currentDay}일입니다. 모든 일정은 이 날짜 이후로 시작해야 합니다.
3. 첫 번째 단계는 현재 날짜 이후의 월요일부터 시작하도록 설정해주세요.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return JSON.parse(response);
}

// Replace cost table in HTML
function replaceCostTable(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal = 0) {
    console.log('Replacing cost table with data:', costTableData);
    
    // Validate and fix negative amounts - 강화된 검증
    console.log('🔍 Starting cost table validation...');
    let actualTotal = 0;
    let qaItemIndex = -1;
    
    // 1단계: 음수 금액 감지 및 QA 항목 찾기
    costTableData.items.forEach((item, index) => {
        console.log(`🔍 Processing item ${index + 1}:`, item);
        const amountStr = item.amount.replace(/[^\d-]/g, '');
        const amount = parseInt(amountStr);
        console.log(`🔍 Extracted amount for ${item.contents}: ${amount} (from "${item.amount}")`);
        
        if (item.type === 'QA') {
            qaItemIndex = index;
            console.log(`🔍 QA item found at index ${index}`);
        }
        
        if (amount >= 0) {
            actualTotal += amount;
        }
    });
    
    // 2단계: QA 항목 수정 (음수이거나 너무 낮은 경우)
    if (qaItemIndex >= 0) {
        const qaItem = costTableData.items[qaItemIndex];
        const qaAmountStr = qaItem.amount.replace(/[^\d-]/g, '');
        const qaAmount = parseInt(qaAmountStr);
        
        if (qaAmount < 0) {
            // 음수인 경우: 다른 항목들을 비례적으로 증가시키고 QA는 적절한 금액으로 설정
            const remainingAmount = subTotal - actualTotal;
            const qaPercentage = 0.1; // QA는 전체의 10% 정도로 설정
            const suggestedQaAmount = Math.round(subTotal * qaPercentage);
            const finalQaAmount = Math.max(suggestedQaAmount, 1000000); // 최소 1,000,000원
            
            // 나머지 금액을 다른 항목들에 비례적으로 분배
            const remainingForOthers = subTotal - finalQaAmount;
            const otherItemsTotal = actualTotal;
            const multiplier = remainingForOthers / otherItemsTotal;
            
            // 다른 항목들의 금액을 비례적으로 조정
            costTableData.items.forEach((item, index) => {
                if (index !== qaItemIndex) {
                    const itemAmountStr = item.amount.replace(/[^\d-]/g, '');
                    const itemAmount = parseInt(itemAmountStr);
                    if (itemAmount > 0) {
                        const newAmount = Math.round(itemAmount * multiplier);
                        item.amount = newAmount.toLocaleString('ko-KR') + '원';
                    }
                }
            });
            
            qaItem.amount = finalQaAmount.toLocaleString('ko-KR') + '원';
            actualTotal = subTotal;
            console.warn(`🚨 Negative QA amount detected: ${qaItem.amount}. Redistributed amounts proportionally. QA set to ${finalQaAmount.toLocaleString('ko-KR')}원 (${qaPercentage * 100}% of total)`);
        } else if (qaAmount < 1000000) {
            // 너무 낮은 경우: 최소 금액으로 설정
            qaItem.amount = '1,000,000원';
            actualTotal += 1000000;
            console.warn(`🚨 QA amount too low: ${qaItem.amount}. Set to minimum 1,000,000원`);
        } else {
            actualTotal += qaAmount;
        }
    }
    
    // 3단계: 기타 항목 검증
    costTableData.items.forEach((item, index) => {
        if (item.type !== 'QA') {
            const amountStr = item.amount.replace(/[^\d-]/g, '');
            const amount = parseInt(amountStr);
            
            if (amount < 500000) {
                console.warn(`🚨 Amount too low for ${item.contents}: ${item.amount}. Setting to minimum 500,000원`);
                item.amount = '500,000원';
                actualTotal += 500000;
            }
        }
    });
    
    console.log('Cost table validation:');
    console.log('Expected subTotal:', subTotal);
    console.log('Actual total from items:', actualTotal);
    console.log('Difference:', Math.abs(subTotal - actualTotal));
    
    let newTableBody = '';
    costTableData.items.forEach(item => {
        newTableBody += `
            <tr>
                <td>${item.contents}</td>
                <td>${item.type}</td>
                <td>${item.amount}</td>
            </tr>`;
    });
    
    console.log('New table body:', newTableBody);
    
    // Replace table body
    html = html.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${newTableBody}</tbody>`);
    
    // Replace summary with dynamic values
    html = html.replace(/\[Sub Total\]/g, subTotalFormatted);
    html = html.replace(/\[VAT\]/g, vatFormatted);
    html = html.replace(/\[Total\]/g, totalAmountFormatted);
    
    return html;
}

// Replace package options in HTML
function replacePackageOptions(html, packageData) {
    let newPackages = '';
    packageData.packages.forEach(pkg => {
        let features = '';
        pkg.features.forEach(feature => {
            features += `<li>${feature}</li>`;
        });
        
        newPackages += `
        <div class="estimate-package-section">
            <div class="estimate-package-title">${pkg.name}</div>
            <div class="estimate-package-price">${pkg.price}</div>
            <ul class="estimate-package-features">
                ${features}
            </ul>
        </div>`;
    });
    
    console.log('New packages HTML:', newPackages);
    
    // Replace the entire package options section
    const packageOptionsRegex = /<div class="estimate-package-options-section">[\s\S]*?<\/div>\s*<\/div>/g;
    const replacement = `<div class="estimate-package-options-section">
        <div class="estimate-section-title">패키지 옵션</div>
        
        ${newPackages}
    </div>`;
    
    html = html.replace(packageOptionsRegex, replacement);
    
    return html;
}

// Replace timeline in HTML
function replaceTimeline(html, timelineData) {
    let newTimelineBody = '';
    let currentYear = new Date().getFullYear();
    
    timelineData.stages.forEach((stage, index) => {
        // Convert MM/DD ~ MM/DD format to YYYY년 MM월 DD일 ~ YYYY년 MM월 DD일 format
        const period = stage.period;
        let formattedPeriod = period;
        
        if (period.includes(' ~ ')) {
            const [startDate, endDate] = period.split(' ~ ');
            
            if (startDate.includes('/') && endDate.includes('/')) {
                const startMonth = parseInt(startDate.split('/')[0]);
                const startDay = startDate.split('/')[1];
                const endMonth = parseInt(endDate.split('/')[0]);
                const endDay = endDate.split('/')[1];
                
                // For first stage, use current year
                let startYear = currentYear;
                let endYear = currentYear;
                
                // If end month is before start month, it's next year
                if (endMonth < startMonth) {
                    endYear = currentYear + 1;
                }
                
                // Update currentYear for next iteration
                currentYear = endYear;
                
                const formattedStartDate = `${startYear}년 ${String(startMonth).padStart(2, '0')}월 ${String(startDay).padStart(2, '0')}일`;
                const formattedEndDate = `${endYear}년 ${String(endMonth).padStart(2, '0')}월 ${String(endDay).padStart(2, '0')}일`;
                
                formattedPeriod = `${formattedStartDate} ~ ${formattedEndDate}`;
            }
        }
        
        newTimelineBody += `
            <tr>
                <td>${stage.stage}</td>
                <td>${stage.content}</td>
                <td>${formattedPeriod}</td>
            </tr>`;
    });
    
    // Add total row - calculate actual duration based on first and last stage dates
    let totalWeeks = 0;
    let totalMonths = 0;
    
    if (timelineData.stages.length > 0) {
        const firstStage = timelineData.stages[0];
        const lastStage = timelineData.stages[timelineData.stages.length - 1];
        
        if (firstStage.period && lastStage.period) {
            const firstStartDate = firstStage.period.split(' ~ ')[0];
            const lastEndDate = lastStage.period.split(' ~ ')[1];
            
            if (firstStartDate.includes('/') && lastEndDate.includes('/')) {
                const startMonth = parseInt(firstStartDate.split('/')[0]);
                const startDay = parseInt(firstStartDate.split('/')[1]);
                const endMonth = parseInt(lastEndDate.split('/')[0]);
                const endDay = parseInt(lastEndDate.split('/')[1]);
                
                // Calculate approximate weeks and months between start and end dates
                const startDate = new Date(2025, startMonth - 1, startDay);
                const endDate = new Date(2026, endMonth - 1, endDay);
                const timeDiff = endDate.getTime() - startDate.getTime();
                totalWeeks = Math.round(timeDiff / (1000 * 60 * 60 * 24 * 7));
                
                // Calculate months more accurately
                const yearDiff = endDate.getFullYear() - startDate.getFullYear();
                const monthDiff = endDate.getMonth() - startDate.getMonth();
                const dayDiff = endDate.getDate() - startDate.getDate();
                
                totalMonths = yearDiff * 12 + monthDiff;
                if (dayDiff < 0) {
                    totalMonths -= 1;
                }
            }
        }
    }
    
    // Fallback to stage count if calculation fails
    if (totalWeeks === 0) {
        totalWeeks = timelineData.stages.length * 2; // 2 weeks per stage on average
        totalMonths = Math.round(totalWeeks / 4);
    }
    
    newTimelineBody += `
        <tr style="background-color: #e8f4f8; font-weight: bold;">
            <td colspan="2">총 개발 기간</td>
            <td>약 ${totalWeeks}주 (${totalMonths}개월)</td>
        </tr>`;
    
    // Replace timeline table - more specific targeting
    const timelineTableRegex = /<div class="estimate-section-title">개발 일정<\/div>[\s\S]*?<table class="estimate-timeline-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(timelineTableRegex, (match) => {
        return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${newTimelineBody}</tbody>`);
    });
    
    return html;
}

// Common OpenAI API call function
async function callOpenAIAPI(apiKey, systemPrompt, userPrompt) {
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API 호출에 실패했습니다.');
    }

    const data = await response.json();
    console.log('API Response:', data); // 디버깅용
    
    // API 응답에서 텍스트 추출
    let responseText = '';
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        responseText = data.choices[0].message.content;
        
        // 마크다운 코드 블록 제거
        responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    } else {
        console.error('Unexpected API response structure:', data);
        throw new Error('API 응답에서 내용을 찾을 수 없습니다.');
    }

    return responseText;
}

// Update preview from HTML code
function updatePreviewFromCode(htmlCode) {
    const previewContainer = document.getElementById('previewContainer');
    
    // Extract body content from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, 'text/html');
    const bodyContent = doc.body.innerHTML;
    
    previewContainer.innerHTML = bodyContent;
}

// Update preview from code editor
function updatePreview() {
    const htmlCode = codeEditor ? codeEditor.getValue() : document.getElementById('htmlCodeEditor').value;
    currentHtmlCode = htmlCode;
    updatePreviewFromCode(htmlCode);
    showMessage('미리보기가 업데이트되었습니다.', 'success');
}

// Format HTML code
function formatCode() {
    if (!codeEditor) return;
    
    let code = codeEditor.getValue();
    
    // Basic HTML formatting
    code = code
        .replace(/></g, '>\n<')  // Add line breaks between tags
        .replace(/^\s+|\s+$/gm, '')  // Remove leading/trailing whitespace
        .replace(/\n\s*\n/g, '\n')  // Remove empty lines
        .split('\n')
        .map(line => {
            // Add proper indentation
            const openTags = (line.match(/</g) || []).length;
            const closeTags = (line.match(/<\//g) || []).length;
            const selfClosing = line.match(/\/>/) ? 1 : 0;
            const netIndent = openTags - closeTags - selfClosing;
            
            let indent = '';
            for (let i = 0; i < Math.max(0, netIndent); i++) {
                indent += '    '; // 4 spaces
            }
            
            return indent + line.trim();
        })
        .join('\n');
    
    codeEditor.setValue(code);
    updatePreview();
    showMessage('코드가 정리되었습니다.', 'success');
}

// Reset code to original
function resetCode() {
    if (originalHtmlCode) {
        if (codeEditor) {
            codeEditor.setValue(originalHtmlCode);
        } else {
            document.getElementById('htmlCodeEditor').value = originalHtmlCode;
        }
        currentHtmlCode = originalHtmlCode;
        updatePreviewFromCode(originalHtmlCode);
        showMessage('원본 코드로 복원되었습니다.', 'success');
    } else {
        // If no AI-generated content, reset to default template
        loadDefaultEstimate();
        if (codeEditor) {
            codeEditor.setValue('');
        } else {
            document.getElementById('htmlCodeEditor').value = '';
        }
        showMessage('기본 견적서 양식으로 복원되었습니다.', 'success');
    }
}

// Download PDF
function downloadPDF() {
    // Check if there's any content to download
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer.innerHTML.trim()) {
        showMessage('다운로드할 내용이 없습니다.', 'error');
        return;
    }

    const element = document.getElementById('previewContainer');
    const previewArea = document.querySelector('.preview-area');
    const estimateContainer = element ? element.querySelector('.estimate-container') : null;
    
    // Check if required elements exist
    if (!element || !previewArea) {
        alert('미리보기 영역을 찾을 수 없습니다.');
        return;
    }
    
    // Store original styles
    const originalBoxShadow = previewArea.style.boxShadow;
    const originalOutline = previewArea.style.outline;
    const originalBorder = previewArea.style.border;
    const originalMargin = previewArea.style.margin;
    const originalPadding = previewArea.style.padding;
    
    const originalEstimateBoxShadow = estimateContainer ? estimateContainer.style.boxShadow : '';
    const originalEstimateOutline = estimateContainer ? estimateContainer.style.outline : '';
    const originalEstimateBorder = estimateContainer ? estimateContainer.style.border : '';
    const originalEstimateMargin = estimateContainer ? estimateContainer.style.margin : '';
    const originalEstimatePadding = estimateContainer ? estimateContainer.style.padding : '';
    
    const originalBodyBoxShadow = document.body.style.boxShadow;
    const originalBodyOutline = document.body.style.outline;
    const originalBodyBorder = document.body.style.border;
    const originalBodyBackground = document.body.style.background;
    const originalHtmlBoxShadow = document.documentElement.style.boxShadow;
    const originalHtmlOutline = document.documentElement.style.outline;
    const originalHtmlBorder = document.documentElement.style.border;
    
    // Add PDF mode class to body
    document.body.classList.add('pdf-mode');
    
    // // Remove shadows and borders for PDF generation
    // previewArea.classList.add('no-shadow');
    // previewArea.style.boxShadow = 'none';
    // previewArea.style.outline = 'none';
    // previewArea.style.border = 'none';
    // previewArea.style.background = 'white';
    
    // if (estimateContainer) {
    //     estimateContainer.style.boxShadow = 'none';
    //     estimateContainer.style.outline = 'none';
    //     estimateContainer.style.border = 'none';
    //     estimateContainer.style.margin = '0';
    //     estimateContainer.style.padding = '40px';
    //     estimateContainer.style.background = 'white';
    // }
    
    // // Remove shadows and outlines from all elements, but preserve table borders
    // const allElements = element.querySelectorAll('*');
    // allElements.forEach(el => {
    //     el.style.boxShadow = 'none';
    //     el.style.outline = 'none';
        
    //     // 테이블과 구분선은 제외하고 명시적으로 스타일 복원
    //     if (el.classList.contains('estimate-table')) {
    //         el.style.borderCollapse = 'collapse';
    //     } else if (el.classList.contains('estimate-timeline-table')) {
    //         el.style.borderCollapse = 'collapse';
    //     } else if (el.classList.contains('estimate-divider-dotted')) {
    //         el.style.borderTop = '1px dotted #000';
        // } else if (el.classList.contains('estimate-divider-solid')) {
        //     // 첫 번째 divider-solid는 얇고 연하게
        //     const prevEl = el.previousElementSibling;
        //     if (prevEl && prevEl.classList.contains('estimate-client-info')) {
        //         el.style.borderTop = '0.1px solid #b9b9b9';
        //     } else {
        //         el.style.borderTop = '1px solid #000';
        //     }
    //     } else if (el.classList.contains('estimate-header')) {
    //         el.style.borderBottom = '2px solid #000';
    //     } else if (el.classList.contains('estimate-notes')) {
    //         el.style.borderTop = '1px solid #000';
    //     } else if (el.classList.contains('estimate-footer')) {
    //         el.style.borderTop = '1px solid #000';
    //     } else if (el.classList.contains('estimate-summary-total')) {
    //         el.style.borderTop = '1px solid #000';
    //     } else if (el.tagName === 'TH') {
    //         el.style.borderBottom = '2px solid #000';
    //     } else if (el.tagName === 'TD') {
    //         el.style.borderBottom = '1px solid #eee';
    //     } else {
    //         el.style.border = 'none';
    //     }
    // });
    
    // // Remove body and html styles
    // document.body.style.boxShadow = 'none';
    // document.body.style.outline = 'none';
    // document.body.style.border = 'none';
    // document.body.style.background = 'white';
    // document.body.style.margin = '0';
    // document.body.style.padding = '0';
    // document.documentElement.style.boxShadow = 'none';
    // document.documentElement.style.outline = 'none';
    // document.documentElement.style.border = 'none';
    
    // Get project name for filename
    const projectName = document.getElementById('projectName')?.value?.trim() || '프로젝트';
    const filename = `[포너즈] ${projectName}_견적서.pdf`;
    
    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 3,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
            allowTaint: true,
            backgroundColor: '#ffffff',
            dpi: 300,
            logging: false,
            width: element.scrollWidth+20,
            height: element.scrollHeight + 200,
            windowWidth: element.scrollWidth+20,
            windowHeight: element.scrollHeight + 200,
            x: 0,
            y: 0,
            foreignObjectRendering: false,
            removeContainer: true,
            ignoreElements: function(element) {
                // PDF 다운로드 버튼 제외
                return element.classList && element.classList.contains('download-btn');
            }
        },
        jsPDF: { 
            unit: 'in', 
            format: 'a4', 
            orientation: 'portrait',
            putOnlyUsedFonts: true,
            floatPrecision: 16,
            compress: false
        }
    };

    // Hide download button temporarily
    const downloadBtn = document.querySelector('.download-btn');
    downloadBtn.style.display = 'none';

    html2pdf().set(opt).from(element).save().then(() => {
        // Remove PDF mode class
        document.body.classList.remove('pdf-mode');
        
        // Restore original styles
        previewArea.classList.remove('no-shadow');
        previewArea.style.boxShadow = originalBoxShadow;
        previewArea.style.outline = originalOutline;
        previewArea.style.border = originalBorder;
        previewArea.style.margin = originalMargin;
        previewArea.style.padding = originalPadding;
        
        if (estimateContainer) {
            estimateContainer.style.boxShadow = originalEstimateBoxShadow;
            estimateContainer.style.outline = originalEstimateOutline;
            estimateContainer.style.border = originalEstimateBorder;
            estimateContainer.style.margin = originalEstimateMargin;
            estimateContainer.style.padding = originalEstimatePadding;
        }
        
        // Restore body and html styles
        document.body.style.boxShadow = originalBodyBoxShadow;
        document.body.style.outline = originalBodyOutline;
        document.body.style.border = originalBodyBorder;
        document.body.style.background = originalBodyBackground;
        document.documentElement.style.boxShadow = originalHtmlBoxShadow;
        document.documentElement.style.outline = originalHtmlOutline;
        document.documentElement.style.border = originalHtmlBorder;
        
        downloadBtn.style.display = 'block';
        showMessage('PDF가 성공적으로 다운로드되었습니다!', 'success');
    }).catch(error => {
        // Remove PDF mode class
        document.body.classList.remove('pdf-mode');
        
        // Restore original styles even on error
        previewArea.classList.remove('no-shadow');
        previewArea.style.boxShadow = originalBoxShadow;
        previewArea.style.outline = originalOutline;
        previewArea.style.border = originalBorder;
        previewArea.style.margin = originalMargin;
        previewArea.style.padding = originalPadding;
        
        if (estimateContainer) {
            estimateContainer.style.boxShadow = originalEstimateBoxShadow;
            estimateContainer.style.outline = originalEstimateOutline;
            estimateContainer.style.border = originalEstimateBorder;
            estimateContainer.style.margin = originalEstimateMargin;
            estimateContainer.style.padding = originalEstimatePadding;
        }
        
        // Restore body and html styles
        document.body.style.boxShadow = originalBodyBoxShadow;
        document.body.style.outline = originalBodyOutline;
        document.body.style.border = originalBodyBorder;
        document.body.style.background = originalBodyBackground;
        document.documentElement.style.boxShadow = originalHtmlBoxShadow;
        document.documentElement.style.outline = originalHtmlOutline;
        document.documentElement.style.border = originalHtmlBorder;
        
        downloadBtn.style.display = 'block';
        showMessage(`PDF 다운로드 중 오류가 발생했습니다: ${error.message}`, 'error');
    });
}

// Load default estimate template
async function loadDefaultEstimate() {
    try {
        const response = await fetch('견적서_템플릿.html');
        const defaultEstimateHtml = await response.text();
        
        document.getElementById('previewContainer').innerHTML = defaultEstimateHtml;
        
        // Update HTML code editor with default template
        if (codeEditor) {
            codeEditor.setValue(defaultEstimateHtml);
        } else {
            document.getElementById('htmlCodeEditor').value = defaultEstimateHtml;
        }
    } catch (error) {
        console.error('템플릿 로드 실패:', error);
        showMessage('템플릿 파일을 불러올 수 없습니다.', 'error');
        
        // Fallback: 빈 상태로 설정
        document.getElementById('previewContainer').innerHTML = '<div style="text-align: center; padding: 50px; color: #666;">견적서 템플릿을 불러오는 중...</div>';
        if (codeEditor) {
            codeEditor.setValue('');
        } else {
            document.getElementById('htmlCodeEditor').value = '';
        }
    }
}

// Initialize CodeMirror
function initializeCodeEditor() {
    const textarea = document.getElementById('htmlCodeEditor');
    if (textarea) {
        // Destroy existing editor if it exists
        if (codeEditor) {
            codeEditor.toTextArea();
            codeEditor = null;
        }
        
        codeEditor = CodeMirror.fromTextArea(textarea, {
            mode: 'htmlmixed',
            theme: 'monokai',
            lineNumbers: true,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: true,
            autoCloseTags: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            highlightSelectionMatches: {showToken: /\w/},
            styleActiveLine: true,
            styleSelectedText: true,
            electricChars: true,
            smartIndent: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "F11": function(cm) {
                    cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                },
                "Esc": function(cm) {
                    if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                },
                "Ctrl-/": "toggleComment",
                "Ctrl-A": "selectAll"
            }
        });
        
        // Refresh the editor to ensure proper rendering
        setTimeout(() => {
            if (codeEditor) {
                codeEditor.refresh();
            }
        }, 100);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load default estimate template
    loadDefaultEstimate();
    
    // Initialize CodeMirror after a short delay to ensure DOM is ready
    setTimeout(initializeCodeEditor, 100);
});
