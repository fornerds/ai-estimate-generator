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

// Get selected template
function getSelectedTemplate() {
    // Check structured input tab template select
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect && templateSelect.offsetParent !== null) {
        return templateSelect.value;
    }
    
    // Check raw input tab template select
    const rawTemplateSelect = document.getElementById('rawTemplateSelect');
    if (rawTemplateSelect && rawTemplateSelect.offsetParent !== null) {
        return rawTemplateSelect.value;
    }
    
    // Default template
    return '견적서_템플릿.html';
}

// Update template preview
async function updateTemplatePreview() {
    const selectedTemplate = getSelectedTemplate();
    try {
        const response = await fetch(selectedTemplate);
        const templateHtml = await response.text();
        document.getElementById('previewContainer').innerHTML = templateHtml;
        
        // Update code editor if it exists
        if (codeEditor) {
            codeEditor.setValue(templateHtml);
        } else {
            document.getElementById('htmlCodeEditor').value = templateHtml;
        }
        
        // Sync template selection between both tabs
        const templateSelect = document.getElementById('templateSelect');
        const rawTemplateSelect = document.getElementById('rawTemplateSelect');
        if (templateSelect && rawTemplateSelect) {
            templateSelect.value = selectedTemplate;
            rawTemplateSelect.value = selectedTemplate;
        }
    } catch (error) {
        console.error('템플릿 미리보기 로드 실패:', error);
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
        // Load selected template
        let templateHtml = '';
        try {
            const selectedTemplate = getSelectedTemplate();
            const response = await fetch(selectedTemplate);
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
            templateHtml,
            null,
            selectedTemplate
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
        // Load selected template
        let templateHtml = '';
        let selectedTemplate = '';
        try {
            selectedTemplate = getSelectedTemplate();
            const response = await fetch(selectedTemplate);
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
            projectInfo.packageBudgets,
            selectedTemplate
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
5. 전체 예산 (중요: 만원 단위로 표시된 경우 숫자만 추출)
6. 추가 요구사항
7. 패키지별 예산 정보 (기본형, 표준형, 프리미엄형 패키지의 예산)

중요 규칙:
- 프로젝트명은 반드시 추출해야 하며, null이 될 수 없습니다
- 프로젝트명이 명시되지 않은 경우, 프로젝트 설명을 분석하여 적절한 프로젝트명을 생성하세요
- 예: "카카오톡 자동 질문 분석 시스템", "AI 기반 고객 문의 관리 플랫폼" 등
- 프로젝트명은 2-30자 정도의 간결하고 명확한 이름으로 생성하세요

전체 예산 추출 규칙 (매우 중요):
- "50만원" → "500000" (50 * 10000 = 500000원)
- "100만원" → "1000000" (100 * 10000 = 1000000원)
- "500만원" → "5000000" (500 * 10000 = 5000000원)
- "50만원정도" → "500000"
- "약 50만원" → "500000"
- 만원 단위로 표시된 경우: 숫자 * 10000으로 변환하여 원 단위로 반환
- 원 단위로 표시된 경우: 숫자만 추출 (예: "500000원" → "500000")
- 예산이 명시되지 않으면 "null"로 설정

패키지 예산 추출 규칙:
- "기본형이 1000만원", "표준형 3000만원", "프리미엄형 5000만원" 등의 패턴을 찾아서 추출
- 패키지명과 금액이 함께 언급된 경우만 추출
- 만원 단위로 표시된 금액을 원 단위로 변환 (예: 1000만원 → 10000000, 50만원 → 500000)
- 패키지별 예산이 명시되지 않으면 null로 설정

JSON 형식으로 응답해주세요:
{
  "projectName": "프로젝트명 (반드시 제공, null 불가)",
  "projectDescription": "상세한 프로젝트 설명",
  "clientName": "클라이언트명",
  "budget": "전체예산(원단위숫자만)또는null",
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
    const projectInfo = safeJSONParse(response);
    
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

// Detect template type
function detectTemplateType(templateHtml, templateFileName = '') {
    // 파일명으로 먼저 확인
    if (templateFileName && (templateFileName.includes('상세설계') || templateFileName.includes('상세견적서'))) {
        return 'detailed'; // 상세 견적서
    }
    // HTML 내용으로 확인
    if (templateHtml.includes('상세설계') || templateHtml.includes('상세설계 견적서') || templateHtml.includes('상세 견적서')) {
        return 'detailed'; // 상세 견적서
    }
    return 'standard'; // 기본 견적서
}

// Partial replacement functions for each section
async function generateEstimateWithPartialReplacement(apiKey, projectName, projectDescription, clientName, budget, timeline, additionalRequirements, aiPrompt, uploadedFileContent, templateHtml, packageBudgets = null, templateFileName = '') {
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
    
    // Detect template type
    const templateType = detectTemplateType(templateHtml, templateFileName);
    console.log('템플릿 타입:', templateType);
    
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
            
            // 디버깅: 입력값 확인
            console.log('Budget calculation for project info:');
            console.log('Original budget:', budget);
            console.log('Budget type:', typeof budget);
            console.log('Budget includes 만원:', typeof budget === 'string' ? budget.includes('만원') : false);
            console.log('Budget includes 천원:', typeof budget === 'string' ? budget.includes('천원') : false);
            console.log('Extracted number:', subTotal);
            
            // 입력값이 문자열에 "만원"이 포함되어 있으면 만원 단위로 변환
            if (typeof budget === 'string' && budget.includes('만원')) {
                subTotal = subTotal * 10000; // 만원 단위로 변환
                console.log('Converted to 만원 unit:', subTotal);
            } else if (typeof budget === 'string' && budget.includes('천원')) {
                subTotal = subTotal * 1000; // 천원 단위로 변환
                console.log('Converted to 천원 unit:', subTotal);
            } else {
                console.log('Using as-is (원 unit):', subTotal);
            }
            // 그 외의 경우는 입력값을 그대로 원 단위로 사용
            vat = Math.round(subTotal * 0.1); // VAT 계산 (10%)
            totalAmount = subTotal + vat; // VAT 포함 총 금액
            
            console.log('Final sub total (VAT 제외):', subTotal);
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
    
    // 템플릿 타입에 따라 다른 데이터 생성
    console.log('🚀 병렬 AI API 호출 시작...');
    const startTime = Date.now();
    
    let costTableData, overviewText, timelineData, packageData, scopeAndPeriodData, detailedScheduleData;
    
    if (templateType === 'detailed') {
        // 상세 견적서용 데이터 생성
        [
            costTableData,
            overviewText,
            timelineData,
            scopeAndPeriodData,
            detailedScheduleData
        ] = await Promise.all([
            generateCostTableDataForDetailed(apiKey, projectName, projectDescription, budget, additionalRequirements, aiPrompt, uploadedFileContent),
            generateProjectOverview(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent, 'detailed'),
            generateTimelineData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent, packageBudgets),
            generateScopeAndPeriodData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent),
            generateDetailedScheduleData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent)
        ]);
    } else {
        // 기본 견적서용 데이터 생성
        [
            costTableData,
            overviewText,
            timelineData,
            packageData
        ] = await Promise.all([
            generateCostTableData(apiKey, projectName, projectDescription, budget, additionalRequirements, aiPrompt, uploadedFileContent),
            generateProjectOverview(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent, 'standard'),
            generateTimelineData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent, packageBudgets),
            generatePackageData(apiKey, projectName, projectDescription, clientName, budget, additionalRequirements, aiPrompt, uploadedFileContent, subTotal, totalAmount, packageBudgets)
        ]);
    }
    
    // If no budget provided, calculate from AI-generated amounts
    if (subTotal === 0) {
        let calculatedSubTotal = 0;
        
        // 템플릿 타입에 따라 다른 데이터 구조 처리
        if (templateType === 'detailed') {
            // 상세 견적서: item, detail, amount 구조
            calculatedSubTotal = costTableData.items.reduce((sum, item) => {
                const amount = parseInt(item.amount.replace(/[^\d]/g, ''));
                return sum + amount;
            }, 0);
        } else {
            // 기본 견적서: contents, type, amount 구조
            calculatedSubTotal = costTableData.items.reduce((sum, item) => {
                const amount = parseInt(item.amount.replace(/[^\d]/g, ''));
                return sum + amount;
            }, 0);
        }
        
        subTotal = calculatedSubTotal;
        vat = Math.round(subTotal * 0.1);
        totalAmount = subTotal + vat;
        
        console.log('AI generated budget calculation:');
        console.log('Sub total (VAT 제외):', subTotal);
        console.log('VAT:', vat);
        console.log('Total amount (VAT 포함):', totalAmount);
    }
    
    // 기본 견적서만 패키지 데이터 생성
    if (templateType === 'standard') {
        packageData = await generatePackageData(apiKey, projectName, projectDescription, clientName, budget, additionalRequirements, aiPrompt, uploadedFileContent, subTotal, totalAmount, packageBudgets);
    }
    
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
    
    // 템플릿 타입에 따라 다른 내용 교체
    if (templateType === 'detailed') {
        // 상세 견적서용 교체
        html = replaceCostTableForDetailed(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal);
        html = replaceScopeAndPeriod(html, scopeAndPeriodData);
        html = replaceDetailedSchedule(html, detailedScheduleData);
    } else {
        // 기본 견적서용 교체
        html = replaceCostTable(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal);
        console.log('Package data:', packageData);
        html = replacePackageOptions(html, packageData);
    }
    
    // 템플릿 타입에 따라 개발 일정 처리
    if (templateType === 'standard') {
        // 기본 견적서: 개발 일정 업데이트 및 교체
        const actualStartDate = timelineData.stages[0]?.period?.split(' ~ ')[0];
        const actualEndDate = timelineData.stages[timelineData.stages.length - 1]?.period?.split(' ~ ')[1];
        
        if (actualStartDate && actualEndDate) {
            // Convert MM/DD format to YYYY년 MM월 DD일 format with proper year handling
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1;
            const currentDay = today.getDate();
            
            let startMonth = parseInt(actualStartDate.split('/')[0]);
            let startDay = parseInt(actualStartDate.split('/')[1]);
            const endMonth = parseInt(actualEndDate.split('/')[0]);
            const endDay = parseInt(actualEndDate.split('/')[1]);
            
            // Ensure start date is in the future
            let startYear = currentYear;
            const startDateObj = new Date(currentYear, startMonth - 1, startDay);
            const minStartDate = new Date(today);
            minStartDate.setDate(minStartDate.getDate() + 7);
            
            if (startDateObj < minStartDate) {
                // Move to next year if month/day has passed
                if (startMonth < minStartDate.getMonth() + 1 || 
                    (startMonth === minStartDate.getMonth() + 1 && startDay < minStartDate.getDate())) {
                    startYear = currentYear + 1;
                } else {
                    // Same year but before minimum date, use minimum date
                    startYear = minStartDate.getFullYear();
                    startMonth = minStartDate.getMonth() + 1;
                    startDay = minStartDate.getDate();
                }
            } else {
                // Check if it's in the same year
                if (startMonth < currentMonth || 
                    (startMonth === currentMonth && startDay < currentDay)) {
                    startYear = currentYear + 1;
                }
            }
            
            // Handle year rollover - if end month is before start month, assume next year
            let endYear = startYear;
            if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
                endYear = startYear + 1;
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
    }
    // 상세 견적서는 개발 일정 (세부)가 이미 replaceDetailedSchedule에서 처리됨
    
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
    
    // Replace payment table - more specific targeting (기본 견적서와 상세 견적서 모두 처리)
    // 기본 견적서: "결제 조건", 상세 견적서: "5. 결제 조건"
    const paymentTableRegex = /<div class="estimate-section-title">(?:5\.\s*)?결제 조건<\/div>[\s\S]*?<table class="estimate-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(paymentTableRegex, (match) => {
        // 상세 견적서의 경우 합계 행이 있는지 확인
        if (match.includes('합계')) {
            // 합계 행 포함
            const paymentTableBodyWithTotal = `${paymentTableBody}
        <tr style="background-color: #e8f4f8; font-weight: bold;">
            <td colspan="2">합계 (V.A.T 포함)</td>
            <td>${formatAmount(totalAmount)}</td>
            <td></td>
        </tr>`;
            return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${paymentTableBodyWithTotal}</tbody>`);
        } else {
            // 기본 견적서 (합계 행 없음)
            return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${paymentTableBody}</tbody>`);
        }
    });
    
    // Replace maintenance section (유지보수 및 지원)
    // 기본 견적서와 상세 견적서 모두 처리
    const maintenanceContent = `
            <li>무상 하자보수: 개발 완료 후 계약기간만큼</li>
            <li>긴급 지원: 24시간 이내 대응</li>
            <li>시스템 모니터링: 서버 및 성능 모니터링, 장애 대응</li>
            <li>오류 수정: 시스템 오류 및 버그 수정</li>
            <li>안정화 지원: 시스템 안정성 점검 및 안정화 지원</li>`;
    
    // 기본 견적서: "유지보수 및 지원", 상세 견적서: "6. 유지보수 및 지원"
    const maintenanceRegex = /<div class="estimate-section-title">(?:6\.\s*)?유지보수 및 지원<\/div>[\s\S]*?<ul class="estimate-package-features">[\s\S]*?<\/ul>/g;
    html = html.replace(maintenanceRegex, (match) => {
        return match.replace(/<ul class="estimate-package-features">[\s\S]*?<\/ul>/g, `<ul class="estimate-package-features">${maintenanceContent}
        </ul>`);
    });
    
    return html;
}

// Replace cost table for detailed estimate (상세 견적서용)
function replaceCostTableForDetailed(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal = 0) {
    let newTableBody = '';
    let totalCost = 0;
    
    costTableData.items.forEach((item) => {
        const amountStr = item.amount.replace(/[^\d]/g, '');
        const amount = parseInt(amountStr) || 0;
        totalCost += amount;
        
        newTableBody += `
            <tr>
                <td>${item.item}</td>
                <td>${item.detail}</td>
                <td>${item.amount}</td>
            </tr>`;
    });
    
    // Add total row
    newTableBody += `
        <tr style="background-color: #e8f4f8; font-weight: bold;">
            <td colspan="2">총 개발 비용</td>
            <td>${subTotalFormatted}</td>
        </tr>`;
    
    // Replace cost table tbody
    const costTableRegex = /<div class="estimate-section-title">3\. 개발 비용 견적<\/div>[\s\S]*?<table class="estimate-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(costTableRegex, (match) => {
        return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${newTableBody}</tbody>`);
    });
    
    return html;
}

// Replace scope and period (개발 범위 및 기간)
function replaceScopeAndPeriod(html, scopeAndPeriodData) {
    let newTableBody = '';
    
    scopeAndPeriodData.stages.forEach((stage) => {
        newTableBody += `
            <tr>
                <td>${stage.stage}</td>
                <td>${stage.content}</td>
                <td>${stage.period}</td>
            </tr>`;
    });
    
    // Add total row
    newTableBody += `
        <tr style="background-color: #e8f4f8; font-weight: bold;">
            <td colspan="2">총 개발 기간</td>
            <td>${scopeAndPeriodData.totalPeriod || '협의'}</td>
        </tr>`;
    
    // Replace scope and period table tbody
    const scopeTableRegex = /<div class="estimate-section-title">2\. 개발 범위 및 기간<\/div>[\s\S]*?<table class="estimate-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(scopeTableRegex, (match) => {
        return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${newTableBody}</tbody>`);
    });
    
    return html;
}

// Replace detailed schedule (개발 일정 세부)
function replaceDetailedSchedule(html, detailedScheduleData) {
    if (!detailedScheduleData || !detailedScheduleData.tasks || detailedScheduleData.tasks.length === 0) {
        console.warn('개발 일정 (세부) 데이터가 없습니다.');
        return html;
    }
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const minStartDate = new Date(today);
    minStartDate.setDate(minStartDate.getDate() + 7);
    
    // 단계별로 그룹화
    const tasksByStage = {};
    detailedScheduleData.tasks.forEach((task) => {
        if (!tasksByStage[task.stage]) {
            tasksByStage[task.stage] = [];
        }
        tasksByStage[task.stage].push(task);
    });
    
    let newTableBody = '';
    let firstTaskStartYear = null;
    let firstTaskStartMonth = null;
    
    // 각 단계별로 HTML 생성
    Object.keys(tasksByStage).forEach((stage, stageIndex) => {
        const tasks = tasksByStage[stage];
        const rowspan = tasks.length;
        
        tasks.forEach((task, taskIndex) => {
            let formattedPeriod = task.period;
            
            // Convert MM/DD ~ MM/DD format to YYYY년 MM월 DD일 ~ YYYY년 MM월 DD일 format if needed
            if (task.period.includes(' ~ ') && task.period.includes('/')) {
                const [startDate, endDate] = task.period.split(' ~ ');
                
                if (startDate.includes('/') && endDate.includes('/')) {
                    let startMonth = parseInt(startDate.split('/')[0]);
                    let startDay = parseInt(startDate.split('/')[1]);
                    const endMonth = parseInt(endDate.split('/')[0]);
                    const endDay = parseInt(endDate.split('/')[1]);
                    
                    let startYear = currentYear;
                    let endYear = currentYear;
                    
                    // For first task, ensure it's in the future
                    if (stageIndex === 0 && taskIndex === 0) {
                        const startDateObj = new Date(currentYear, startMonth - 1, startDay);
                        if (startDateObj < minStartDate) {
                            // If the date is before minimum start date, use minimum start date
                            startYear = minStartDate.getFullYear();
                            startMonth = minStartDate.getMonth() + 1;
                            startDay = minStartDate.getDate();
                        } else {
                            // Check if it's in the same year
                            if (startMonth < currentMonth || 
                                (startMonth === currentMonth && startDay < currentDay)) {
                                startYear = currentYear + 1;
                            }
                        }
                        
                        firstTaskStartYear = startYear;
                        firstTaskStartMonth = startMonth;
                    } else {
                        // For subsequent tasks, use the year from first task as base
                        if (firstTaskStartYear !== null) {
                            startYear = firstTaskStartYear;
                            if (startMonth < firstTaskStartMonth) {
                                startYear = firstTaskStartYear + 1;
                            }
                        } else {
                            if (startMonth < currentMonth || 
                                (startMonth === currentMonth && startDay < currentDay)) {
                                startYear = currentYear + 1;
                            }
                        }
                    }
                    
                    // End date: same year as start, or next year if end month < start month
                    endYear = startYear;
                    if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
                        endYear = startYear + 1;
                    }
                    
                    const formattedStartDate = `${startYear}년 ${String(startMonth).padStart(2, '0')}월 ${String(startDay).padStart(2, '0')}일`;
                    const formattedEndDate = `${endYear}년 ${String(endMonth).padStart(2, '0')}월 ${String(endDay).padStart(2, '0')}일`;
                    formattedPeriod = `${formattedStartDate} ~ ${formattedEndDate}`;
                }
            }
            
            if (taskIndex === 0) {
                // 첫 번째 작업: rowspan 포함
                newTableBody += `
            <tr>
                <td${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}>${stage}</td>
                <td>${task.task}</td>
                <td>${formattedPeriod}</td>
            </tr>`;
            } else {
                // 나머지 작업: rowspan 없이
                newTableBody += `
            <tr>
                <td>${task.task}</td>
                <td>${formattedPeriod}</td>
            </tr>`;
            }
        });
    });
    
    // Replace detailed schedule table tbody
    const scheduleTableRegex = /<div class="estimate-section-title">4\. 세부 개발 일정<\/div>[\s\S]*?<table class="estimate-timeline-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(scheduleTableRegex, (match) => {
        return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${newTableBody}</tbody>`);
    });
    
    return html;
}

// Replace deliverables (산출물)
function replaceDeliverables(html, deliverablesData) {
    let newTableBody = '';
    
    deliverablesData.deliverables.forEach((deliverable) => {
        newTableBody += `
            <tr>
                <td>${deliverable.category}</td>
                <td>${deliverable.item}</td>
                <td>${deliverable.format}</td>
            </tr>`;
    });
    
    // Replace deliverables table tbody
    const deliverablesTableRegex = /<div class="estimate-section-title">7\. 산출물<\/div>[\s\S]*?<table class="estimate-table">[\s\S]*?<tbody>[\s\S]*?<\/tbody>[\s\S]*?<\/table>/g;
    html = html.replace(deliverablesTableRegex, (match) => {
        return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${newTableBody}</tbody>`);
    });
    
    return html;
}

// Generate closing remarks (맺음말)
async function generateClosingRemarks(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 견적서의 맺음말을 생성해주세요.

규칙:
1. 프로젝트에 적합한 전문적인 맺음말 작성
2. 프로젝트의 성공적 수행에 대한 의지와 전문성 강조
3. 2-3문장으로 구성
4. 자연스럽고 전문적인 문체 사용
5. 견적서에 적합한 공식적인 톤 유지
6. 문장으로만 응답 (JSON 형식 사용 안 함)`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 견적서에 적합한 맺음말을 작성해주세요.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt, false);
    return response.trim();
}

// Replace closing remarks (맺음말)
function replaceClosingRemarks(html, closingRemarks) {
    const closingRemarksRegex = /<div class="estimate-section-title">8\. 맺음말<\/div>[\s\S]*?<p style="font-size: 15px; color: #333; margin: 15px 0;">[\s\S]*?<\/p>/g;
    html = html.replace(closingRemarksRegex, `<div class="estimate-section-title">8. 맺음말</div>
    <p style="font-size: 15px; color: #333; margin: 15px 0;">${closingRemarks}</p>`);
    
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
            
            // 디버깅: 입력값 확인
            console.log('Budget calculation for cost distribution:');
            console.log('Original budget:', budget);
            console.log('Budget type:', typeof budget);
            console.log('Budget includes 만원:', typeof budget === 'string' ? budget.includes('만원') : false);
            console.log('Budget includes 천원:', typeof budget === 'string' ? budget.includes('천원') : false);
            console.log('Extracted number:', totalAmount);
            
            // 입력값에 "만원"이 포함되어 있으면 만원 단위로 변환
            if (typeof budget === 'string' && budget.includes('만원')) {
                totalAmount = totalAmount * 10000; // 만원 단위로 변환
                console.log('Converted to 만원 unit:', totalAmount);
            } else if (typeof budget === 'string' && budget.includes('천원')) {
                totalAmount = totalAmount * 1000; // 천원 단위로 변환
                console.log('Converted to 천원 unit:', totalAmount);
            } else {
                console.log('Using as-is (원 unit):', totalAmount);
            }
            // 그 외의 경우는 입력값을 그대로 원 단위로 사용
            subTotal = totalAmount;
            console.log('Final sub total (VAT 제외):', subTotal);
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
    const costData = safeJSONParse(response);
    
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

// Generate cost table data for detailed estimate (상세 견적서용)
async function generateCostTableDataForDetailed(apiKey, projectName, projectDescription, budget, additionalRequirements, aiPrompt, uploadedFileContent) {
    let subTotal = 0;
    if (budget) {
        const budgetMatch = budget.match(/(\d+)/);
        if (budgetMatch) {
            let totalAmount = parseInt(budgetMatch[1]);
            if (typeof budget === 'string' && budget.includes('만원')) {
                totalAmount = totalAmount * 10000;
            } else if (typeof budget === 'string' && budget.includes('천원')) {
                totalAmount = totalAmount * 1000;
            }
            subTotal = totalAmount;
        }
    }

    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 개발 비용 견적 테이블의 항목들을 생성해주세요.

규칙:
1. 각 항목은 "항목", "상세 내용", "비용 (원)"으로 구성
2. 프로젝트 유형에 맞는 적절한 항목들로 구성
3. Amount는 원화로 표시 (예: 1,500,000원)
4. 모든 금액은 반드시 양수여야 함
5. 프로젝트의 복잡도와 규모를 분석하여 현실적인 가격으로 설정
6. 반드시 정확히 6개의 항목만 생성하세요 (6개를 초과하면 안 됩니다)
7. 상세 내용은 반드시 50글자 이내로 작성하세요 (50글자를 초과하면 안 됩니다)
8. 동사형이나 문장형 표현을 사용하지 마세요 (예: "분석합니다", "설계합니다" 등은 사용 금지)
9. JSON 형식으로 응답

응답 형식:
{
  "items": [
    {"item": "항목명", "detail": "상세 내용", "amount": "1,500,000원"},
    ...
  ]
}`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
${subTotal > 0 ? `\n중요: 총 예산은 ${subTotal.toLocaleString('ko-KR')}원(VAT 제외)입니다. 이 금액에 맞춰 항목들의 비용을 배분해주세요.` : ''}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 개발 비용 견적 항목들을 생성해주세요.

중요: 
1. 반드시 정확히 6개의 항목만 생성하세요. 6개를 초과하거나 미만이면 안 됩니다.
2. 상세 내용은 반드시 50글자 이내로 작성하세요. 50글자를 초과하면 안 됩니다.
3. 동사형이나 문장형 표현을 사용하지 마세요. 예: "분석합니다", "설계합니다" 등은 사용 금지`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return safeJSONParse(response);
}

// Generate scope and period data (개발 범위 및 기간)
async function generateScopeAndPeriodData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 개발 범위 및 기간 테이블을 생성해주세요.

규칙:
1. 각 단계는 "단계", "주요 내용", "기간"으로 구성
2. 프로젝트 유형에 맞는 적절한 단계들로 구성
3. 기간은 "X주" 또는 "X개월" 형식으로 표시
4. 반드시 정확히 4개의 단계만 생성하세요 (4개를 초과하면 안 됩니다)
5. 주요 내용은 반드시 50글자 이내로 작성하세요 (50글자를 초과하면 안 됩니다)
6. JSON 형식으로 응답

응답 형식:
{
  "stages": [
    {"stage": "단계명", "content": "주요 내용", "period": "9/19 ~ 9/30"},
    ...
  ],
  "totalPeriod": "약 X주"
}`;

    // 현재 날짜 정보 추가
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    
    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
${timeline ? `개발 기간: ${timeline}` : ''}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 개발 범위 및 기간 테이블을 생성해주세요.

중요: 
1. 반드시 정확히 4개의 단계만 생성하세요. 4개를 초과하거나 미만이면 안 됩니다.
2. 주요 내용은 반드시 50글자 이내로 작성하세요. 50글자를 초과하면 안 됩니다.
3. 현재 날짜는 ${currentYear}년 ${currentMonth}월 ${currentDay}일입니다. 모든 일정은 이 날짜 이후로 시작해야 합니다.
4. 기간 형식이 "MM/DD ~ MM/DD"인 경우, 시작 날짜는 현재 날짜 이후여야 합니다.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return safeJSONParse(response);
}

// Generate detailed schedule data (개발 일정 세부)
async function generateDetailedScheduleData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 개발 일정 (세부) 테이블을 생성해주세요.

규칙:
1. 각 단계별로 여러 상세 작업을 포함
2. "단계", "상세 작업", "일정"으로 구성
3. 같은 단계의 여러 작업은 rowspan을 사용할 수 있도록 구성
4. 일정은 "MM/DD ~ MM/DD" 형식
5. 반드시 정확히 11개의 작업만 생성하세요 (11개를 초과하면 안 됩니다)
6. JSON 형식으로 응답

응답 형식:
{
  "tasks": [
    {"stage": "단계명", "task": "상세 작업", "period": "10/1 ~ 10/7"},
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
${timeline ? `개발 기간: ${timeline}` : ''}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 개발 일정 (세부) 테이블을 생성해주세요.

중요: 
1. 반드시 정확히 11개의 작업만 생성하세요. 11개를 초과하거나 미만이면 안 됩니다.
2. 현재 날짜는 ${currentYear}년 ${currentMonth}월 ${currentDay}일입니다. 모든 일정은 이 날짜 이후로 시작해야 합니다.
3. 첫 번째 작업의 시작 날짜는 현재 날짜 이후여야 합니다.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return safeJSONParse(response);
}

// Generate deliverables data (산출물)
async function generateDeliverablesData(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 산출물 테이블을 생성해주세요.

규칙:
1. 각 산출물은 "구분", "산출물", "형식"으로 구성
2. 프로젝트 유형에 맞는 적절한 산출물들로 구성
3. 형식은 "PDF", "문서" 등으로 표시
4. JSON 형식으로 응답

응답 형식:
{
  "deliverables": [
    {"category": "구분", "item": "산출물명", "format": "PDF"},
    ...
  ]
}`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 산출물 테이블을 생성해주세요.`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return safeJSONParse(response);
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
            // 입력값에 "만원"이 포함되어 있으면 만원 단위로 변환
            if (typeof budget === 'string' && budget.includes('만원')) {
                budgetAmount = budgetAmount * 10000; // 만원 단위로 변환
            } else if (typeof budget === 'string' && budget.includes('천원')) {
                budgetAmount = budgetAmount * 1000; // 천원 단위로 변환
            }
            // 그 외의 경우는 입력값을 그대로 원 단위로 사용
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
    const packageData = safeJSONParse(response);
    
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
async function generateProjectOverview(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent, templateType = 'standard') {
    // 상세 견적서는 한 문장만 생성
    const sentenceCount = templateType === 'detailed' ? '1개의 문장으로만 구성 (반드시 1문장)' : '1-2개의 문장으로만 구성 (최대 2문장)';
    const charLimit = templateType === 'detailed' ? '8. 반드시 한 문장으로만 작성하세요. 문장이 두 개 이상이면 안 됩니다.\n9. 반드시 100자 이내로 작성하세요. 100자를 초과하면 안 됩니다.' : '';
    
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 간결하고 명확한 프로젝트 개요를 생성해주세요.

규칙:
1. ${sentenceCount}
2. 자연스럽고 전문적인 문체 사용
3. 프로젝트의 핵심 목적과 특징을 간결하게 설명
4. 기술적 세부사항보다는 비즈니스 가치와 사용자 혜택 중심으로 작성
5. 견적서에 적합한 공식적인 톤 유지
6. "혁신적인", "차세대" 등 과장된 표현 사용 금지
7. 불필요한 수식어나 장황한 설명 금지
${charLimit}

응답 형식:
문장으로만 응답하세요. JSON이나 다른 형식은 사용하지 마세요.`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 견적서에 적합한 프로젝트 개요를 자연스러운 문장 형식으로 작성해주세요.
${templateType === 'detailed' ? '\n중요: 반드시 한 문장으로만 작성하고, 100자 이내로 작성하세요. 100자를 초과하면 안 됩니다.' : ''}`;

    // 프로젝트 개요는 텍스트 형식이므로 JSON 형식 사용 안 함
    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt, false);
    // JSON 형식이 아닌 경우 그대로 반환 (이미 텍스트)
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
${timeline && timeline !== '협의' ? `\n**개발 기간 (중요): ${timeline}**\n이 기간을 반드시 준수하여 개발 일정을 설정해주세요. 예를 들어 "3일"이면 3일 내에, "3개월"이면 3개월 내에 프로젝트를 완료할 수 있도록 일정을 조정해주세요.` : '개발 기간: 협의 (프로젝트 설명을 분석하여 적절한 개발 기간을 설정해주세요.)'}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 개발 일정의 7단계를 생성해주세요.

중요: 
1. ${timeline && timeline !== '협의' ? `**입력된 개발 기간(${timeline})을 반드시 준수하여** 전체 일정을 설정해주세요.` : '프로젝트 설명을 분석하여 적절한 개발 기간을 설정해주세요.'}
2. 현재 날짜는 ${currentYear}년 ${currentMonth}월 ${currentDay}일입니다. 모든 일정은 이 날짜 이후로 시작해야 합니다.
3. 첫 번째 단계는 현재 날짜 이후의 월요일부터 시작하도록 설정해주세요.
4. ${timeline && timeline !== '협의' ? `전체 개발 기간이 ${timeline}에 맞도록 각 단계의 기간을 조정해주세요.` : ''}`;

    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    return safeJSONParse(response);
}

// Replace cost table in HTML
function replaceCostTable(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal = 0) {
    console.log('Replacing cost table with data:', costTableData);
    
    // Validate and fix negative amounts - 강화된 검증
    console.log('🔍 Starting cost table validation...');
    
    // 예산이 작을 경우 (7개 항목 * 50만원 = 350만원 미만) 최소 금액 체크 스킵
    const minBudgetThreshold = 3500000; // 7개 항목 * 50만원
    
    let actualTotal = 0;
    let qaItemIndex = -1;
    
    // 1단계: 음수 금액 먼저 처리 및 QA 항목 찾기
    costTableData.items.forEach((item, index) => {
        console.log(`🔍 Processing item ${index + 1}:`, item);
        const amountStr = item.amount.replace(/[^\d-]/g, '');
        const amount = parseInt(amountStr);
        console.log(`🔍 Extracted amount for ${item.contents}: ${amount} (from "${item.amount}")`);
        
        if (item.type === 'QA') {
            qaItemIndex = index;
            console.log(`🔍 QA item found at index ${index}`);
        }
        
        // 음수 금액을 즉시 0으로 설정
        if (amount < 0) {
            console.warn(`🚨 Negative amount detected for ${item.contents}: ${item.amount}. Setting to 0원`);
            item.amount = '0원';
        } else {
            actualTotal += amount;
        }
    });
    
    // 2단계: QA 항목 수정 (음수이거나 너무 낮은 경우)
    // 예산이 작을 경우 (350만원 미만) QA 최소 금액도 조정
    const minQAAmount = subTotal >= minBudgetThreshold ? 1000000 : Math.max(10000, Math.round(subTotal * 0.1)); // 최소 1만원
    
    if (qaItemIndex >= 0) {
        const qaItem = costTableData.items[qaItemIndex];
        const qaAmountStr = qaItem.amount.replace(/[^\d-]/g, '');
        const qaAmount = parseInt(qaAmountStr);
        
        if (qaAmount < 0) {
            // 음수인 경우: 다른 항목들을 비례적으로 증가시키고 QA는 적절한 금액으로 설정
            const remainingAmount = subTotal - actualTotal;
            const qaPercentage = 0.1; // QA는 전체의 10% 정도로 설정
            const suggestedQaAmount = Math.round(subTotal * qaPercentage);
            const finalQaAmount = Math.max(suggestedQaAmount, minQAAmount);
            
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
            console.warn(`🚨 Negative QA amount detected. Redistributed amounts proportionally. QA set to ${finalQaAmount.toLocaleString('ko-KR')}원 (${qaPercentage * 100}% of total)`);
        } else if (qaAmount < minQAAmount) {
            // 너무 낮은 경우: 최소 금액으로 설정 (예산에 따라 조정)
            qaItem.amount = minQAAmount.toLocaleString('ko-KR') + '원';
            actualTotal += minQAAmount;
            console.warn(`🚨 QA amount too low: ${qaAmount.toLocaleString('ko-KR')}원. Set to minimum ${minQAAmount.toLocaleString('ko-KR')}원`);
        } else {
            actualTotal += qaAmount;
        }
    }
    
    // 3단계: 기타 항목 검증 및 예산에 맞게 조정
    // 예산이 작을 경우 최소 금액 체크 스킵
    const shouldUseMinAmount = subTotal >= minBudgetThreshold;
    
    if (!shouldUseMinAmount) {
        // 예산이 작은 경우: 현재 합계를 예산에 맞게 비례 배분
        // QA 항목은 별도 처리하므로 제외
        const itemsForDistribution = costTableData.items.filter((item, index) => index !== qaItemIndex);
        const positiveItems = itemsForDistribution.filter(item => {
            const amountStr = item.amount.replace(/[^\d-]/g, '');
            const amount = parseInt(amountStr) || 0;
            return amount > 0;
        });
        
        const currentTotal = positiveItems.reduce((sum, item) => {
            const amountStr = item.amount.replace(/[^\d-]/g, '');
            const amount = parseInt(amountStr) || 0;
            return sum + amount;
        }, 0);
        
        // QA 항목 금액 계산 (예산의 10% 또는 최소 금액)
        const qaPercentage = 0.1;
        const qaAmount = Math.max(minQAAmount, Math.round(subTotal * qaPercentage));
        const remainingForOthers = subTotal - qaAmount;
        
        if (currentTotal > 0 && remainingForOthers > 0) {
            const ratio = remainingForOthers / currentTotal;
            
            // 양수 항목들만 비례 배분 (QA 제외)
            positiveItems.forEach((item) => {
                const amountStr = item.amount.replace(/[^\d-]/g, '');
                const amount = parseInt(amountStr) || 0;
                const newAmount = Math.round(amount * ratio);
                item.amount = newAmount.toLocaleString('ko-KR') + '원';
            });
            
            // QA 항목 설정
            if (qaItemIndex >= 0) {
                costTableData.items[qaItemIndex].amount = qaAmount.toLocaleString('ko-KR') + '원';
            }
            
            actualTotal = subTotal;
            console.log(`💰 예산이 작아서 비례 배분 적용: ${currentTotal.toLocaleString('ko-KR')}원 → ${remainingForOthers.toLocaleString('ko-KR')}원 (QA: ${qaAmount.toLocaleString('ko-KR')}원 별도)`);
        } else if (currentTotal === 0 && qaItemIndex >= 0) {
            // 모든 항목이 0이거나 음수인 경우: QA만 설정하고 나머지를 균등 분배
            const itemsCount = itemsForDistribution.length;
            const amountPerItem = Math.floor(remainingForOthers / itemsCount);
            const remainder = remainingForOthers % itemsCount;
            
            itemsForDistribution.forEach((item, index) => {
                const baseAmount = amountPerItem;
                const finalAmount = index < remainder ? baseAmount + 1 : baseAmount;
                item.amount = finalAmount.toLocaleString('ko-KR') + '원';
            });
            
            costTableData.items[qaItemIndex].amount = qaAmount.toLocaleString('ko-KR') + '원';
            actualTotal = subTotal;
            console.log(`💰 모든 항목을 균등 분배: 항목당 ${amountPerItem.toLocaleString('ko-KR')}원, QA: ${qaAmount.toLocaleString('ko-KR')}원`);
        }
    } else {
        // 예산이 충분한 경우: 최소 금액 체크
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
    }
    
    // 최종 합계 재계산
    actualTotal = costTableData.items.reduce((sum, item) => {
        const amountStr = item.amount.replace(/[^\d-]/g, '');
        const amount = parseInt(amountStr) || 0;
        return sum + amount;
    }, 0);
    
    // 합계가 맞지 않으면 가장 큰 금액 항목(또는 마지막 항목)으로 조정
    if (actualTotal !== subTotal && costTableData.items.length > 0) {
        const difference = subTotal - actualTotal;
        
        // QA 항목이 아니고 양수 금액을 가진 항목 중 가장 큰 금액 항목 찾기
        let largestItem = null;
        let largestAmount = 0;
        let largestIndex = -1;
        
        costTableData.items.forEach((item, index) => {
            if (index !== qaItemIndex) {
                const amountStr = item.amount.replace(/[^\d-]/g, '');
                const amount = parseInt(amountStr) || 0;
                if (amount > largestAmount) {
                    largestAmount = amount;
                    largestItem = item;
                    largestIndex = index;
                }
            }
        });
        
        // 가장 큰 금액 항목이 없으면 마지막 항목 사용 (QA 제외)
        const targetItem = largestItem || costTableData.items[costTableData.items.length - 1];
        const targetIndex = largestIndex >= 0 ? largestIndex : costTableData.items.length - 1;
        
        const targetAmountStr = targetItem.amount.replace(/[^\d-]/g, '');
        const targetAmount = parseInt(targetAmountStr) || 0;
        const newTargetAmount = Math.max(0, targetAmount + difference);
        targetItem.amount = newTargetAmount.toLocaleString('ko-KR') + '원';
        actualTotal = subTotal;
        console.log(`🔧 항목 조정으로 합계 맞춤: ${targetItem.contents} ${targetAmount.toLocaleString('ko-KR')}원 → ${newTargetAmount.toLocaleString('ko-KR')}원 (차이: ${difference > 0 ? '+' : ''}${difference.toLocaleString('ko-KR')}원)`);
    }
    
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
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    // Calculate the minimum start date (today + 7 days to ensure it's in the future)
    const minStartDate = new Date(today);
    minStartDate.setDate(minStartDate.getDate() + 7);
    const minStartYear = minStartDate.getFullYear();
    const minStartMonth = minStartDate.getMonth() + 1;
    const minStartDay = minStartDate.getDate();
    
    let firstStageStartYear = null;
    let firstStageStartMonth = null;
    let firstStageStartDay = null;
    
    timelineData.stages.forEach((stage, index) => {
        // Convert MM/DD ~ MM/DD format to YYYY년 MM월 DD일 ~ YYYY년 MM월 DD일 format
        const period = stage.period;
        let formattedPeriod = period;
        
        if (period.includes(' ~ ')) {
            const [startDate, endDate] = period.split(' ~ ');
            
            if (startDate.includes('/') && endDate.includes('/')) {
                let startMonth = parseInt(startDate.split('/')[0]);
                let startDay = parseInt(startDate.split('/')[1]);
                const endMonth = parseInt(endDate.split('/')[0]);
                const endDay = parseInt(endDate.split('/')[1]);
                
                let startYear = currentYear;
                let endYear = currentYear;
                
                // For first stage, ensure it's in the future
                if (index === 0) {
                    // Check if the start date is before today
                    const startDateObj = new Date(currentYear, startMonth - 1, startDay);
                    if (startDateObj < minStartDate) {
                        // Move to next year if month/day has passed
                        if (startMonth < minStartMonth || 
                            (startMonth === minStartMonth && startDay < minStartDay)) {
                            startYear = currentYear + 1;
                        } else {
                            // Same year but before minimum date, use minimum date
                            startYear = minStartYear;
                            startMonth = minStartMonth;
                            startDay = minStartDay;
                        }
                    } else {
                        // Check if it's in the same year
                        if (startMonth < currentMonth || 
                            (startMonth === currentMonth && startDay < currentDay)) {
                            startYear = currentYear + 1;
                        }
                    }
                    
                    firstStageStartYear = startYear;
                    firstStageStartMonth = startMonth;
                    firstStageStartDay = startDay;
                } else {
                    // For subsequent stages, use the year from first stage as base
                    if (firstStageStartYear !== null) {
                        startYear = firstStageStartYear;
                        // If start month is before first stage start month, it's next year
                        if (startMonth < firstStageStartMonth) {
                            startYear = firstStageStartYear + 1;
                        }
                    } else {
                        // Fallback: use current year
                        if (startMonth < currentMonth || 
                            (startMonth === currentMonth && startDay < currentDay)) {
                            startYear = currentYear + 1;
                        }
                    }
                }
                
                // End date: same year as start, or next year if end month < start month
                endYear = startYear;
                if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
                    endYear = startYear + 1;
                }
                
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
                
                // Determine correct year based on current date (same logic as above)
                const today = new Date();
                const baseYear = today.getFullYear();
                
                // Start date: use current year (or next year if month has passed)
                let startYear = baseYear;
                if (startMonth < today.getMonth() + 1 || 
                    (startMonth === today.getMonth() + 1 && startDay < today.getDate())) {
                    startYear = baseYear + 1;
                }
                
                // End date: same year as start, or next year if end month < start month
                let endYear = startYear;
                if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
                    endYear = startYear + 1;
                }
                
                // Calculate approximate weeks and months between start and end dates
                const startDate = new Date(startYear, startMonth - 1, startDay);
                const endDate = new Date(endYear, endMonth - 1, endDay);
                const timeDiff = endDate.getTime() - startDate.getTime();
                const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));
                totalWeeks = Math.round(daysDiff / 7);
                
                // Calculate months more accurately
                const yearDiff = endDate.getFullYear() - startDate.getFullYear();
                const monthDiff = endDate.getMonth() - startDate.getMonth();
                const dayDiff = endDate.getDate() - startDate.getDate();
                
                totalMonths = yearDiff * 12 + monthDiff;
                if (dayDiff < 0) {
                    totalMonths -= 1;
                }
                
                // Ensure minimum values
                if (totalWeeks === 0 && daysDiff > 0) {
                    totalWeeks = 1;
                }
                if (totalMonths === 0 && totalWeeks > 0) {
                    totalMonths = 1;
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

// Extract JSON from response text (handles cases where API returns text with JSON embedded)
function extractJSON(responseText) {
    // Remove markdown code blocks
    responseText = responseText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find JSON object (starts with { and ends with })
    // Find the first opening brace
    const firstBrace = responseText.indexOf('{');
    if (firstBrace === -1) {
        return responseText; // No JSON found
    }
    
    // Find matching closing brace by counting braces
    let braceCount = 0;
    let jsonEnd = -1;
    
    for (let i = firstBrace; i < responseText.length; i++) {
        if (responseText[i] === '{') {
            braceCount++;
        } else if (responseText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                jsonEnd = i;
                break;
            }
        }
    }
    
    if (jsonEnd !== -1) {
        return responseText.substring(firstBrace, jsonEnd + 1);
    }
    
    // If no matching brace found, try simple regex match
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0];
    }
    
    // If no JSON found, return original text
    return responseText;
}

// Safe JSON parse with error handling
function safeJSONParse(text) {
    try {
        const jsonText = extractJSON(text);
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('JSON 파싱 오류:', error);
        console.error('원본 응답:', text);
        throw new Error(`JSON 파싱 실패: ${error.message}. API 응답이 올바른 JSON 형식이 아닙니다.`);
    }
}

// Common OpenAI API call function
async function callOpenAIAPI(apiKey, systemPrompt, userPrompt, useJSON = true) {
    // Call OpenAI API
    const requestBody = {
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
    };
    
    // JSON 형식이 필요한 경우에만 response_format 추가
    if (useJSON) {
        requestBody.response_format = { type: "json_object" };
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
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

// Get estimate CSS styles
async function getEstimateCSS() {
    try {
        const response = await fetch('styles.css');
        const cssContent = await response.text();
        
        // Find the start of estimate CSS section (around line 566)
        const estimateStartIndex = cssContent.indexOf('/* 전체 선 두께 얇게 조정 */');
        if (estimateStartIndex === -1) {
            throw new Error('견적서 CSS 섹션을 찾을 수 없습니다.');
        }
        
        // Extract from estimate section to the end (or until CodeMirror styles)
        const estimateEndIndex = cssContent.indexOf('/* CodeMirror Styles */', estimateStartIndex);
        const estimateCSS = estimateEndIndex !== -1 
            ? cssContent.substring(estimateStartIndex, estimateEndIndex).trim()
            : cssContent.substring(estimateStartIndex).trim();
        
        // Base styles needed for estimate
        const baseCSS = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #ffffff;
    color: #000000;
    line-height: 1.6;
    padding: 40px 20px;
}`;
        
        return baseCSS + '\n\n' + estimateCSS;
    } catch (error) {
        console.warn('CSS 파일 로드 실패, 기본 스타일 사용:', error);
        // Return minimal CSS if file can't be loaded
        return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #ffffff;
    color: #000000;
    line-height: 1.6;
    padding: 40px 20px;
}

.estimate-container {
    max-width: 750px;
    margin: 0 auto;
    background: white;
    padding: 40px;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

.estimate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #000;
}

.estimate-title-section {
    display: flex;
    align-items: center;
}

.estimate-title {
    font-size: 28px;
    font-weight: bold;
    color: #000;
    margin-right: 10px;
}

.estimate-subtitle {
    font-size: 18px;
    font-weight: normal;
    color: #000;
}

.estimate-logo {
    width: 50px;
    height: 50px;
    background-image: url('fornerds_logo.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}

.estimate-date {
    font-size: 15px;
    margin: 15px 0;
    color: #333;
}

.estimate-client-info {
    font-size: 15px;
    margin-bottom: 15px;
    color: #333;
}

.estimate-divider-dotted {
    border-top: 1px dotted #000;
    margin: 15px 0;
}

.estimate-divider-solid {
    border-top: 1px solid #000;
    margin: 15px 0;
}

.estimate-info-section {
    margin: 20px 0;
}

.estimate-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 8px 0;
    padding: 4px 0;
}

.estimate-info-label {
    font-weight: bold;
    color: #333;
    flex: 0 0 auto;
}

.estimate-info-value {
    text-align: right;
    color: #000;
    flex: 0 0 auto;
}

.estimate-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.estimate-table th {
    background-color: #f8f9fa;
    padding: 12px 10px;
    text-align: left;
    font-weight: bold;
    border-bottom: 2px solid #000;
    font-size: 13px;
}

.estimate-table th:last-child,
.estimate-table td:last-child {
    text-align: right;
}

.estimate-table td {
    padding: 10px 10px;
    border-bottom: 1px solid #eee;
    font-size: 13px;
}

.estimate-table tr:nth-child(even) {
    background-color: #f9f9f9;
}

.estimate-summary {
    text-align: right;
    margin: 15px 0;
    font-size: 16px;
}

.estimate-summary-item {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    padding: 3px 0;
}

.estimate-summary .estimate-summary-total {
    font-weight: bold;
    font-size: 18px;
    border-top: 0.1px solid #b9b9b9;
    padding-top: 10px;
    margin-top: 15px;
}

.estimate-section-title {
    font-size: 18px;
    font-weight: bold;
    margin: 25px 0 15px 0;
    color: #000;
}

.estimate-package-section {
    margin: 8px 0;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #f8f9fa;
}

.estimate-package-title {
    font-size: 16px;
    font-weight: bold;
    color: #20B2AA;
    margin: 6px 0 0px 0;
}

.estimate-package-price {
    font-size: 20px;
    font-weight: bold;
    color: #000;
    margin: 4px 0 4px 0;
}

.estimate-package-features {
    list-style: none;
    padding-left: 0;
}

.estimate-package-features li {
    margin: 6px 0;
    padding-left: 18px;
    position: relative;
    font-size: 14px;
}

.estimate-package-features li:before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #20B2AA;
    font-weight: bold;
}

.estimate-timeline-table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 13px;
}

.estimate-timeline-table th,
.estimate-timeline-table td {
    padding: 10px;
    text-align: left;
    border: 1px solid #ddd;
}

.estimate-timeline-table th {
    background-color: #f8f9fa;
    font-weight: bold;
    font-size: 12px;
}

.estimate-notes {
    margin-top: 25px;
    padding-top: 5px;
    border-top: 1px solid #000;
}

.estimate-notes ul {
    list-style: none;
    padding-left: 0;
}

.estimate-notes li {
    margin: 10px 0;
    padding-left: 20px;
    position: relative;
    font-size: 13px;
}

.estimate-notes li:before {
    content: "•";
    position: absolute;
    left: 0;
    color: #000;
    font-weight: bold;
}

.estimate-signature-section {
    margin-top: 20px;
    margin-bottom: 20px;
    padding-top: 20px;
    display: flex;
    justify-content: flex-end;
}

.estimate-signature-content-wrapper {
    display: flex;
    align-items: center;
    gap: 30px;
}

.estimate-signature-texts {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
}

.estimate-signature-name {
    font-size: 14px;
    font-weight: bold;
    color: #000;
    text-align: right;
}

.estimate-signature-representative {
    font-size: 14px;
    color: #333;
    text-align: right;
}

.estimate-signature-seal {
    display: flex;
    align-items: center;
    justify-content: center;
}

.seal-image {
    width: 70px;
    height: 70px;
    object-fit: contain;
    display: block;
}

.estimate-signature-value {
    font-size: 14px;
    color: #000;
    text-align: left;
}

.estimate-footer {
    margin-top: 25px;
    padding-top: 15px;
    border-top: 1px solid #000;
    text-align: right;
    font-size: 12px;
    color: #666;
}

.company-info-section {
    margin: 120px 0 20px 0;
}`;
    }
}

// Save HTML to 견적서 folder
async function saveHTMLToFolder() {
    // Check if there's any content to save
    if (!currentHtmlCode && !originalHtmlCode) {
        showMessage('저장할 내용이 없습니다. 먼저 견적서를 생성해주세요.', 'error');
        return;
    }
    
    let htmlContent = currentHtmlCode || originalHtmlCode;
    if (!htmlContent || htmlContent.trim() === '') {
        showMessage('저장할 HTML 내용이 없습니다.', 'error');
        return;
    }
    
    // Get CSS and wrap HTML with full document structure
    const estimateCSS = await getEstimateCSS();
    
    // Extract project name for title
    let projectName = '견적서';
    try {
        const projectNameMatch = htmlContent.match(/프로젝트명<\/div>\s*<div[^>]*>([^<]+)</);
        if (projectNameMatch && projectNameMatch[1]) {
            projectName = projectNameMatch[1].trim();
        }
    } catch (e) {
        console.warn('프로젝트명 추출 실패:', e);
    }
    
    // Wrap HTML content with full document structure including CSS
    const fullHTML = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} 견적서</title>
    <style>
${estimateCSS}
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    htmlContent = fullHTML;
    
    // Remove special characters for filename
    const filenameProjectName = projectName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    
    // Create filename with date and project name
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `견적서_${filenameProjectName}_${dateStr}.html`;
    
    // Try to use File System Access API (modern browsers)
    if ('showDirectoryPicker' in window) {
        try {
            // Ask user to select the 견적서 folder
            const folderHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            // Check if selected folder is "견적서" or try to get/create it
            let targetFolderHandle = folderHandle;
            
            if (folderHandle.name !== '견적서') {
                try {
                    // Try to get existing "견적서" folder
                    targetFolderHandle = await folderHandle.getDirectoryHandle('견적서', { create: true });
                } catch (e) {
                    // If can't create subfolder, ask user to navigate to 견적서 folder
                    showMessage('"견적서" 폴더를 선택해주세요.', 'error');
                    return;
                }
            }
            
            // Create or get file handle
            const fileHandle = await targetFolderHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(htmlContent);
            await writable.close();
            
            showMessage(`HTML 파일이 저장되었습니다: 견적서/${filename}`, 'success');
            return;
        } catch (error) {
            // User cancelled or error occurred, fall back to download
            if (error.name !== 'AbortError') {
                console.warn('File System Access API 실패, 다운로드로 대체:', error);
            } else {
                // User cancelled
                return;
            }
        }
    }
    
    // Fallback: Use download with folder name in filename
    // This will prompt user to save in "견적서" folder manually
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename; // Just filename, user will save to 견적서 folder
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage(`HTML 파일이 다운로드되었습니다: ${filename}\n다운로드 폴더에서 "견적서" 폴더로 이동하세요.`, 'success');
}

// Load HTML file
async function loadHTMLFile(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.html')) {
        showMessage('HTML 파일만 불러올 수 있습니다.', 'error');
        return;
    }
    
    try {
        const fileContent = await readTextFile(file);
        
        // Extract estimate content from full HTML document
        let estimateContent = '';
        
        // Create a temporary DOM element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = fileContent;
        
        // Try to find .estimate-container element
        const estimateContainer = tempDiv.querySelector('.estimate-container');
        if (estimateContainer) {
            estimateContent = estimateContainer.outerHTML;
        } else {
            // Try to extract body content
            const bodyElement = tempDiv.querySelector('body');
            if (bodyElement) {
                estimateContent = bodyElement.innerHTML.trim();
            } else {
                // Check if the content itself is the estimate (no body tag)
                const hasBodyTag = fileContent.match(/<body[^>]*>/i);
                if (!hasBodyTag) {
                    // No body tag, assume the whole content is the estimate
                    estimateContent = fileContent.trim();
                } else {
                    // Has body tag but couldn't parse, try regex fallback
                    const bodyMatch = fileContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    if (bodyMatch && bodyMatch[1]) {
                        estimateContent = bodyMatch[1].trim();
                    } else {
                        throw new Error('HTML 구조를 파싱할 수 없습니다.');
                    }
                }
            }
        }
        
        if (!estimateContent || estimateContent === '') {
            showMessage('HTML 파일에서 견적서 내용을 찾을 수 없습니다.', 'error');
            return;
        }
        
        // Update preview and code editor
        document.getElementById('previewContainer').innerHTML = estimateContent;
        
        // Update HTML code editor
        if (codeEditor) {
            codeEditor.setValue(estimateContent);
        } else {
            document.getElementById('htmlCodeEditor').value = estimateContent;
        }
        
        // Update global variables
        originalHtmlCode = estimateContent;
        currentHtmlCode = estimateContent;
        
        // Switch to preview tab
        const previewTab = document.querySelector('.preview-area .tab');
        if (previewTab) {
            switchTab('preview', previewTab);
        }
        
        showMessage(`HTML 파일이 성공적으로 불러와졌습니다: ${file.name}`, 'success');
        
        // Reset file input
        event.target.value = '';
    } catch (error) {
        console.error('HTML 파일 로드 오류:', error);
        showMessage(`HTML 파일 로드 중 오류가 발생했습니다: ${error.message}`, 'error');
    }
}

// Load default estimate template
async function loadDefaultEstimate() {
    try {
        const selectedTemplate = getSelectedTemplate();
        const response = await fetch(selectedTemplate);
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
