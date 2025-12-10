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
- "50만원", "50만원정도", "약 50만원" → "500000" (50 * 10000 = 500000원)
- "100만원", "백만원" → "1000000" (100 * 10000 = 1000000원)
- "500만원", "5백만원", "오백만원" → "5000000" (500 * 10000 = 5000000원)
- "천만원", "1천만원", "최소천만원" → "10000000" (1000 * 10000 = 10000000원)
- "2천만원", "이천만원" → "20000000" (2000 * 10000 = 20000000원)
- 만원 단위로 표시된 경우: 숫자 * 10000으로 변환하여 원 단위로 반환
- 한글 숫자 표현도 인식: "백만원"=100만원, "오백만원"=500만원, "이천만원"=2000만원 등
- "천만원"은 "1000만원"과 동일하게 처리 (1000 * 10000 = 10000000원)
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

위 원시 데이터에서 견적서 작성에 필요한 정보를 추출해주세요.

중요: 예산 추출 시 다음 표현들을 올바르게 변환해야 합니다:
- "천만원", "1천만원", "최소천만원" → "10000000" (천만원 = 1000만원 = 10,000,000원)
- "백만원" → "1000000" (100만원 = 1,000,000원)
- "5백만원", "오백만원" → "5000000" (500만원 = 5,000,000원)
- "이천만원", "2천만원" → "20000000" (2000만원 = 20,000,000원)
한글 숫자 표현도 정확히 인식하여 변환하세요.`;

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
    if (templateFileName && templateFileName.includes('단계별견적서')) {
        return 'phase-based'; // 단계별 견적서
    }
    // HTML 내용으로 확인
    if (templateHtml.includes('상세설계') || templateHtml.includes('상세설계 견적서') || templateHtml.includes('상세 견적서')) {
        return 'detailed'; // 상세 견적서
    }
    if (templateHtml.includes('단계별 개발 비용 견적') || templateHtml.includes('estimate-phase-section')) {
        return 'phase-based'; // 단계별 견적서
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
    
    let costTableData, overviewText, timelineData, packageData, scopeAndPeriodData, detailedScheduleData, phaseBasedData;
    
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
    } else if (templateType === 'phase-based') {
        // 단계별 견적서용 데이터 생성
        [
            phaseBasedData,
            overviewText,
            timelineData
        ] = await Promise.all([
            generatePhaseBasedData(apiKey, projectName, projectDescription, budget, timeline, additionalRequirements, aiPrompt, uploadedFileContent),
            generateProjectOverview(apiKey, projectName, projectDescription, additionalRequirements, aiPrompt, uploadedFileContent, 'standard'),
            generateTimelineData(apiKey, projectName, projectDescription, timeline, additionalRequirements, aiPrompt, uploadedFileContent, packageBudgets)
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
        } else if (templateType === 'phase-based') {
            // 단계별 견적서: 각 단계의 견적 합산
            if (phaseBasedData && phaseBasedData.phases) {
                phaseBasedData.phases.forEach((phase) => {
                    if (phase.estimate) {
                        // 견적 문자열에서 숫자 추출 (예: "₩50,000,000원")
                        const estimateMatch = phase.estimate.match(/[\d,]+/);
                        if (estimateMatch) {
                            const numbers = estimateMatch[0].replace(/,/g, '');
                            const amount = parseInt(numbers);
                            if (!isNaN(amount)) {
                                calculatedSubTotal += amount;
                            }
                        }
                    }
                });
            }
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
    // [프로젝트 개요 내용] 플레이스홀더 교체
    html = html.replace(/\[프로젝트 개요 내용\]/g, overviewText);
    
    // 추가로 일반적인 프로젝트 개요 패턴도 교체
    const overviewPatterns = [
        /<p style="font-size: 15px; color: #333; margin:[\s\S]*?">\[프로젝트 개요 내용\]<\/p>/g,
        /<p[^>]*>\[프로젝트 개요 내용\]<\/p>/g
    ];
    
    overviewPatterns.forEach(pattern => {
        html = html.replace(pattern, (match) => {
            const styleMatch = match.match(/style="[^"]*"/);
            const style = styleMatch ? styleMatch[0] : 'style="font-size: 15px; color: #333; margin: 0 0 20px 0;"';
            return `<p ${style}>${overviewText}</p>`;
        });
    });
    
    console.log('Project overview replacement:');
    console.log('Original description:', projectDescription);
    console.log('Overview text to replace:', overviewText);
    
    // 템플릿 타입에 따라 다른 내용 교체
    if (templateType === 'detailed') {
        // 상세 견적서용 교체
        html = replaceCostTableForDetailed(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal);
        html = replaceScopeAndPeriod(html, scopeAndPeriodData);
        html = replaceDetailedSchedule(html, detailedScheduleData);
    } else if (templateType === 'phase-based') {
        // 단계별 견적서용 교체
        html = replacePhaseBasedEstimate(html, phaseBasedData);
    } else {
        // 기본 견적서용 교체
        html = replaceCostTable(html, costTableData, subTotalFormatted, vatFormatted, totalAmountFormatted, subTotal);
        console.log('Package data:', packageData);
        html = replacePackageOptions(html, packageData);
    }
    
    // 템플릿 타입에 따라 개발 일정 처리
    if (templateType === 'standard' || templateType === 'phase-based') {
        // 기본 견적서 및 단계별 견적서: 개발 일정 업데이트 및 교체
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
                // Use minimum start date (7 days from today)
                startYear = minStartDate.getFullYear();
                startMonth = minStartDate.getMonth() + 1;
                startDay = minStartDate.getDate();
            } else {
                // Date is already in the future, keep current year
                startYear = currentYear;
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
    let paymentTableBody = '';
    
    if (templateType === 'phase-based' && phaseBasedData && phaseBasedData.phases) {
        // 단계별 견적서: 각 단계별 결제 조건 생성
        const phases = phaseBasedData.phases;
        const phaseCount = phases.length;
        
        // 각 단계의 견적 추출 및 합산
        let phaseEstimates = [];
        let totalPhaseEstimate = 0;
        phases.forEach((phase) => {
            let phaseEstimate = 0;
            if (phase.estimate) {
                const estimateMatch = phase.estimate.match(/[\d,]+/);
                if (estimateMatch) {
                    phaseEstimate = parseInt(estimateMatch[0].replace(/,/g, ''));
                }
            }
            phaseEstimates.push(phaseEstimate);
            totalPhaseEstimate += phaseEstimate;
        });
        
        // 계약금 (전체의 30%)
        const contractAmount = Math.round(totalAmount * 0.3);
        paymentTableBody += `
        <tr>
            <td>계약금</td>
            <td>30%</td>
            <td>${formatAmount(contractAmount)}</td>
            <td>계약 체결 시</td>
        </tr>`;
        
        // 각 단계별 결제 조건 (나머지 70%를 단계별 견적 비율로 분배)
        let remainingAmount = totalAmount - contractAmount;
        phases.forEach((phase, index) => {
            const phaseNumber = phase.phaseNumber || (index + 1);
            const phaseEstimate = phaseEstimates[index];
            
            // 마지막 단계는 나머지 금액 모두
            let phaseAmount;
            let phaseRatio;
            if (index === phases.length - 1) {
                phaseAmount = remainingAmount;
                phaseRatio = Math.round((phaseAmount / totalAmount) * 100 * 10) / 10;
            } else {
                // 각 단계의 견적 비율에 따라 분배
                const phaseRatioPercent = totalPhaseEstimate > 0 ? (phaseEstimate / totalPhaseEstimate) : (1 / phaseCount);
                phaseAmount = Math.round(remainingAmount * phaseRatioPercent);
                phaseRatio = Math.round((phaseAmount / totalAmount) * 100 * 10) / 10;
                remainingAmount -= phaseAmount;
            }
            
            paymentTableBody += `
        <tr>
            <td>${phaseNumber}단계 완료</td>
            <td>${phaseRatio}%</td>
            <td>${formatAmount(phaseAmount)}</td>
            <td>${phaseNumber}단계 개발 완료 및 검수 후</td>
        </tr>`;
        });
    } else {
        // 기본 견적서 및 상세 견적서: 기존 방식
        const paymentAmount = Math.round(totalAmount / 2);
        paymentTableBody = `
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
    }
    
    // Replace payment table - more specific targeting (기본 견적서와 상세 견적서 모두 처리)
    if (templateType === 'phase-based') {
        // 단계별 견적서: 개별 플레이스홀더 교체
        const phases = phaseBasedData && phaseBasedData.phases ? phaseBasedData.phases : [];
        
        // 계약금 교체
        const contractAmount = Math.round(totalAmount * 0.3);
        html = html.replace(/\[계약금 비율\]/g, '30%');
        html = html.replace(/\[계약금 금액\]/g, formatAmount(contractAmount));
        html = html.replace(/\[계약금 지급 시점\]/g, '계약 체결 시');
        
        // 각 단계별 결제 조건 교체
        let remainingAmount = totalAmount - contractAmount;
        let totalPhaseEstimate = 0;
        const phaseEstimates = [];
        
        phases.forEach((phase) => {
            let phaseEstimate = 0;
            if (phase.estimate) {
                const estimateMatch = phase.estimate.match(/[\d,]+/);
                if (estimateMatch) {
                    phaseEstimate = parseInt(estimateMatch[0].replace(/,/g, ''));
                }
            }
            phaseEstimates.push(phaseEstimate);
            totalPhaseEstimate += phaseEstimate;
        });
        
        phases.forEach((phase, index) => {
            const phaseNumber = phase.phaseNumber || (index + 1);
            const phaseEstimate = phaseEstimates[index] || 0;
            
            // 마지막 단계는 나머지 금액 모두
            let phaseAmount;
            let phaseRatio;
            if (index === phases.length - 1) {
                phaseAmount = remainingAmount;
            } else {
                const phaseRatioPercent = totalPhaseEstimate > 0 ? (phaseEstimate / totalPhaseEstimate) : (1 / phases.length);
                phaseAmount = Math.round(remainingAmount * phaseRatioPercent);
                remainingAmount -= phaseAmount;
            }
            phaseRatio = Math.round((phaseAmount / totalAmount) * 100 * 10) / 10;
            
            // 단계별 결제 조건 교체
            html = html.replace(
                new RegExp(`\\[${phaseNumber}단계 비율\\]`, 'g'),
                `${phaseRatio}%`
            );
            html = html.replace(
                new RegExp(`\\[${phaseNumber}단계 금액\\]`, 'g'),
                formatAmount(phaseAmount)
            );
            html = html.replace(
                new RegExp(`\\[${phaseNumber}단계 지급 시점\\]`, 'g'),
                `${phaseNumber}단계 개발 완료 및 검수 후`
            );
        });
    } else {
        // 기본 견적서 및 상세 견적서: 기존 방식
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
                // 기본 견적서
                return match.replace(/<tbody>[\s\S]*?<\/tbody>/g, `<tbody>${paymentTableBody}</tbody>`);
            }
        });
    }
    
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

// Replace phase-based estimate (단계별 견적서)
function replacePhaseBasedEstimate(html, phaseBasedData) {
    if (!phaseBasedData || !phaseBasedData.phases || phaseBasedData.phases.length === 0) {
        console.warn('단계별 견적서 데이터가 없습니다.');
        return html;
    }

    // 각 단계 교체
    phaseBasedData.phases.forEach((phase, index) => {
        const phaseNumber = phase.phaseNumber || (index + 1);
        
        // 단계명 교체 - 여러 형식 지원
        // 형식 1: 1단계: [1단계명]
        // 형식 2: 1단계: [단계명 1]
        let cleanPhaseName = phase.phaseName || `단계 ${phaseNumber}`;
        // "1단계:", "2단계:" 등의 접두사 제거
        cleanPhaseName = cleanPhaseName.replace(/^\d+단계:\s*/, '').trim();
        
        // 형식 1: [1단계명], [2단계명], [3단계명]
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계명\\]`, 'g'),
            cleanPhaseName
        );
        
        // 형식 2: [단계명 1], [단계명 2], [단계명 3]
        html = html.replace(
            new RegExp(`\\[단계명 ${phaseNumber}\\]`, 'g'),
            cleanPhaseName
        );
        
        // 형식 3: 1단계: [1단계명], 2단계: [2단계명], 3단계: [3단계명]
        html = html.replace(
            new RegExp(`${phaseNumber}단계: \\[${phaseNumber}단계명\\]`, 'g'),
            `${phaseNumber}단계: ${cleanPhaseName}`
        );
        
        // 형식 4: 1단계: [단계명 1], 2단계: [단계명 2], 3단계: [단계명 3]
        html = html.replace(
            new RegExp(`${phaseNumber}단계: \\[단계명 ${phaseNumber}\\]`, 'g'),
            `${phaseNumber}단계: ${cleanPhaseName}`
        );

        // 개발 범위 리스트 생성
        let scopeList = '';
        if (phase.developmentScope && Array.isArray(phase.developmentScope)) {
            phase.developmentScope.forEach((item) => {
                scopeList += `                    <li>${item}</li>\n`;
            });
        } else {
            // 기본 항목
            for (let i = 1; i <= 5; i++) {
                scopeList += `                    <li>[개발 범위 항목 ${i}]</li>\n`;
            }
        }

        // 개발 범위 리스트 교체 - 각 단계별로 정확하게 매칭
        const scopePattern = new RegExp(
            `(${phaseNumber}단계: [^<]+</div>[\\s\\S]*?<strong>개발 범위:</strong>[\\s\\S]*?<ul class="estimate-option-list">)([\\s\\S]*?)(</ul>[\\s\\S]*?<div style="margin: 15px 0;">[\\s\\S]*?<strong>기술 스택:</strong>)`,
            'g'
        );
        
        html = html.replace(scopePattern, (match, before, oldList, after) => {
            return before + '\n' + scopeList + '                ' + after;
        });

        // 기술 스택 리스트 생성
        let techStackList = '';
        if (phase.techStack && Array.isArray(phase.techStack)) {
            phase.techStack.forEach((item) => {
                techStackList += `                    <li>${item}</li>\n`;
            });
        } else {
            // 기본 항목
            for (let i = 1; i <= 4; i++) {
                techStackList += `                    <li>[${phaseNumber}단계 기술 스택 ${i}]</li>\n`;
            }
        }

        // 기술 스택 리스트 교체 - 각 단계별로 정확하게 매칭
        const techStackPattern = new RegExp(
            `(${phaseNumber}단계: [^<]+</div>[\\s\\S]*?<strong>기술 스택:</strong>[\\s\\S]*?<ul class="estimate-option-list">)([\\s\\S]*?)(</ul>[\\s\\S]*?<div class="estimate-phase-footer">)`,
            'g'
        );
        
        html = html.replace(techStackPattern, (match, before, oldList, after) => {
            return before + '\n' + techStackList + '                ' + after;
        });

        // 견적 교체
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계 견적\\]`, 'g'),
            phase.estimate || `[${phaseNumber}단계 견적]`
        );

        // 개발 기간 교체
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계 기간\\]`, 'g'),
            phase.period || `[${phaseNumber}단계 기간]`
        );

        // 1단계 전체 견적 교체 (1단계만)
        if (phaseNumber === 1) {
            html = html.replace(
                /\[1단계 전체 견적\]/g,
                phase.estimate || `[1단계 전체 견적]`
            );
        }

        // 개발 기간 교체 (footer에 있는 형식)
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계 개발 기간\\]`, 'g'),
            phase.period || `[${phaseNumber}단계 개발 기간]`
        );

        // 프로젝트명 교체 (상단 테이블 및 요약 테이블)
        // 위에서 이미 cleanPhaseName을 정의했으므로 재사용
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계 프로젝트명\\]`, 'g'),
            cleanPhaseName
        );

        // 개발기간 교체 (요약 테이블)
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계 개발기간\\]`, 'g'),
            phase.period || `[${phaseNumber}단계 개발기간]`
        );

        // 우선순위 교체 (요약 테이블) - AI가 생성한 값 사용, 없으면 기본값
        const priority = phase.priority || `${phaseNumber}순위`;
        html = html.replace(
            new RegExp(`\\[${phaseNumber}단계 우선순위\\]`, 'g'),
            priority
        );
    });

    // 통합 패키지 옵션 교체
    if (phaseBasedData.packages && Array.isArray(phaseBasedData.packages)) {
        phaseBasedData.packages.forEach((pkg, index) => {
            const optionLetter = String.fromCharCode(65 + index); // A, B, C
            const optionName = pkg.name || `옵션 ${optionLetter}`;
            
            // 패키지명 교체
            html = html.replace(
                new RegExp(`옵션 ${optionLetter}: \\[패키지명 ${optionLetter}\\]`, 'g'),
                optionName
            );

            // 패키지 견적 교체
            html = html.replace(
                new RegExp(`\\[옵션 ${optionLetter} 견적\\]`, 'g'),
                pkg.estimate || `[옵션 ${optionLetter} 견적]`
            );

            // 패키지 기간 교체
            html = html.replace(
                new RegExp(`\\[옵션 ${optionLetter} 기간\\]`, 'g'),
                pkg.period || `[옵션 ${optionLetter} 기간]`
            );
        });
    }

    // 유지보수 섹션 교체
    if (phaseBasedData.maintenance) {
        const maintenance = phaseBasedData.maintenance;
        
        // 무상 하자보수
        if (maintenance.warranty) {
            html = html.replace(
                /<li>\[무상 하자보수 내용\]<\/li>/g,
                `<li>${maintenance.warranty}</li>`
            );
        }
        
        // 유지보수 비용
        if (maintenance.annualCost && Array.isArray(maintenance.annualCost)) {
            let annualCostList = '';
            maintenance.annualCost.forEach((item) => {
                annualCostList += `                <li>${item}</li>\n`;
            });
            const annualCostPattern = new RegExp(
                '(<strong>유지보수 비용 \\(연간\\):</strong>\\s*<ul class="estimate-package-features">)([\\s\\S]*?)(</ul>)',
                'g'
            );
            html = html.replace(annualCostPattern, `$1\n${annualCostList}            $3`);
        }
        
        // 추가 개발
        if (maintenance.additionalDevelopment && Array.isArray(maintenance.additionalDevelopment)) {
            let additionalDevList = '';
            maintenance.additionalDevelopment.forEach((item) => {
                additionalDevList += `                <li>${item}</li>\n`;
            });
            const additionalDevPattern = new RegExp(
                '(<strong>추가 개발:</strong>\\s*<ul class="estimate-package-features">)([\\s\\S]*?)(</ul>)',
                'g'
            );
            html = html.replace(additionalDevPattern, `$1\n${additionalDevList}            $3`);
        }
    }

    // 특이사항 섹션 교체
    if (phaseBasedData.specialNotes && Array.isArray(phaseBasedData.specialNotes)) {
        let specialNotesList = '';
        phaseBasedData.specialNotes.forEach((note) => {
            specialNotesList += `                <li>${note}</li>\n`;
        });
        // 기존 특이사항 항목들을 교체 (마지막 3개 항목은 유지)
        html = html.replace(
            /(<div class="estimate-notes">\s*<ul>\s*)(<li>\[특이사항 1\]<\/li>\s*<li>\[특이사항 2\]<\/li>\s*<li>\[특이사항 3\]<\/li>\s*<li>\[특이사항 4\]<\/li>)/g,
            `$1${specialNotesList}                `
        );
    }

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
                        // Always start from current year
                        startYear = currentYear;
                        
                        const startDateObj = new Date(currentYear, startMonth - 1, startDay);
                        if (startDateObj < minStartDate) {
                            // If the date is before minimum start date, use minimum start date
                            startYear = minStartDate.getFullYear();
                            startMonth = minStartDate.getMonth() + 1;
                            startDay = minStartDate.getDate();
                        } else {
                            // Date is already in the future, keep current year
                            startYear = currentYear;
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
        if (isNaN(amount) || amount === null || amount === undefined) {
            return '0원';
        }
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

가격 설정 규칙 (매우 중요):
${packageBudgets && packageBudgets.basic && !isNaN(parseInt(packageBudgets.basic)) ? `- 기본형: ${parseInt(packageBudgets.basic).toLocaleString('ko-KR')}원 (지정된 가격)` : totalAmount > 0 ? `- 기본형: 프로젝트의 복잡도, 기능 수, 기술 난이도, 개발 기간 등을 종합적으로 분석하여 적절한 가격을 설정하세요. 표준형(Total Amount) 대비 기본형은 프로젝트 특성에 따라 25-50% 수준으로 설정하되, 기본적인 기능만 포함하므로 충분히 저렴한 가격이어야 합니다.` : `- 기본형: 프로젝트 복잡도, 기능 수, 기술 난이도 등을 분석하여 적절한 기본 가격을 설정하세요.`}
${packageBudgets && packageBudgets.standard && !isNaN(parseInt(packageBudgets.standard)) ? `- 표준형: ${parseInt(packageBudgets.standard).toLocaleString('ko-KR')}원 (지정된 가격)` : totalAmount > 0 ? `- 표준형: 반드시 Total Amount인 ${totalAmount.toLocaleString('ko-KR')}원과 정확히 일치해야 합니다! (이 금액은 변경할 수 없습니다)` : `- 표준형: 프로젝트의 전체 기능과 복잡도를 고려하여 적절한 가격을 설정하세요. 기본형보다 충분히 높은 가격이어야 합니다.`}
${packageBudgets && packageBudgets.premium && !isNaN(parseInt(packageBudgets.premium)) ? `- 프리미엄형: ${parseInt(packageBudgets.premium).toLocaleString('ko-KR')}원 (지정된 가격)` : totalAmount > 0 ? `- 프리미엄형: 프로젝트의 고급 기능, 추가 서비스, 프리미엄 요소 등을 종합적으로 분석하여 적절한 가격을 설정하세요. 표준형(Total Amount) 대비 프리미엄형은 프로젝트 특성에 따라 150-300% 수준으로 설정하되, 프리미엄 가치를 충분히 반영한 가격이어야 합니다.` : `- 프리미엄형: 프로젝트의 프리미엄 기능과 추가 가치를 고려하여 적절한 가격을 설정하세요. 표준형보다 충분히 높은 가격이어야 합니다.`}

가격 판단 기준:
- 프로젝트의 기술적 복잡도 (AI/ML, 실시간 처리, 보안 등)
- 기능의 수와 다양성
- 개발 기간과 인력 투입
- 유지보수 및 지원 수준
- 각 패키지에 포함된 기능의 가치 차이
- 시장 가격 수준과 경쟁력

CRITICAL: 
${totalAmount > 0 ? `- 표준형 패키지 가격은 반드시 Total Amount (${totalAmount.toLocaleString('ko-KR')}원)와 정확히 일치해야 합니다!` : ''}
- 가격은 반드시 기본형 < 표준형 < 프리미엄형 순이어야 하며, 각 패키지 간 가격 차이는 프로젝트 특성에 맞게 충분히 크게 설정해야 합니다!
- 패키지 간 가격 차이가 너무 작으면 안 됩니다. 각 패키지의 가치 차이를 명확히 반영해야 합니다!

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

가격 설정 시 고려사항:
${totalAmount > 0 ? `- 표준형 패키지의 가격은 반드시 Total Amount인 ${totalAmount.toLocaleString('ko-KR')}원과 정확히 일치해야 합니다!` : ''}
- 프로젝트의 기술적 복잡도, 기능 수, 개발 난이도를 종합적으로 분석하여 각 패키지의 적절한 가격을 판단하세요.
- 기본형은 최소한의 기능만 포함하므로 충분히 저렴하게, 프리미엄형은 고급 기능과 추가 가치를 반영하여 충분히 높게 설정하세요.
- 각 패키지 간 가격 차이는 프로젝트 특성에 맞게 명확하게 구분되어야 합니다. 가격 차이가 너무 작으면 안 됩니다.
- 프로젝트 설명, 예상 예산, 추가 요구사항 등을 모두 고려하여 현실적이고 합리적인 가격을 설정하세요.

중요: 프로젝트 설명을 분석하여 적절한 플랫폼 유형을 판단하고, 해당 유형에 맞는 구체적이고 명확한 기능들로 패키지를 구성해주세요.`;

    // Generate package data using AI (including prices and features)
    const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt);
    const packageData = safeJSONParse(response);
    
    console.log('AI generated package data:', packageData);
    
    // 패키지 가격 강제 설정
    if (packageData.packages && packageData.packages.length >= 3) {
    // 표준형 패키지 가격을 totalAmount로 강제 설정
        if (totalAmount > 0) {
        const standardPackage = packageData.packages.find(pkg => pkg.name.includes('표준형') || pkg.name.includes('표준'));
        if (standardPackage) {
            standardPackage.price = formatAmount(totalAmount);
            console.log(`✅ 표준형 패키지 가격을 Total Amount(${totalAmount.toLocaleString('ko-KR')}원)로 설정했습니다.`);
            }
        }
        
        // packageBudgets가 있으면 기본형과 프리미엄형도 강제 설정
        if (packageBudgets) {
            const basicPackage = packageData.packages.find(pkg => pkg.name.includes('기본형') || pkg.name.includes('기본'));
            if (basicPackage && packageBudgets.basic) {
                const basicPrice = parseInt(packageBudgets.basic);
                if (!isNaN(basicPrice) && basicPrice > 0) {
                    basicPackage.price = formatAmount(basicPrice);
                    console.log(`✅ 기본형 패키지 가격을 지정된 가격(${basicPrice.toLocaleString('ko-KR')}원)으로 설정했습니다.`);
                } else {
                    console.warn(`⚠️ 기본형 패키지 가격이 유효하지 않습니다: ${packageBudgets.basic}`);
                }
            }
            
            const premiumPackage = packageData.packages.find(pkg => pkg.name.includes('프리미엄형') || pkg.name.includes('프리미엄'));
            if (premiumPackage && packageBudgets.premium) {
                const premiumPrice = parseInt(packageBudgets.premium);
                if (!isNaN(premiumPrice) && premiumPrice > 0) {
                    premiumPackage.price = formatAmount(premiumPrice);
                    console.log(`✅ 프리미엄형 패키지 가격을 지정된 가격(${premiumPrice.toLocaleString('ko-KR')}원)으로 설정했습니다.`);
                } else {
                    console.warn(`⚠️ 프리미엄형 패키지 가격이 유효하지 않습니다: ${packageBudgets.premium}`);
                }
            }
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

// Generate phase-based estimate data using AI
async function generatePhaseBasedData(apiKey, projectName, projectDescription, budget, timeline, additionalRequirements, aiPrompt, uploadedFileContent) {
    const systemPrompt = `당신은 견적서 작성 전문가입니다. 주어진 프로젝트 정보를 바탕으로 단계별 개발 비용 견적을 생성해주세요.

규칙:
1. 정확히 3개의 단계를 생성 (1단계, 2단계, 3단계)
2. 각 단계는 단계명, 개발 범위(10-15개 항목), 기술 스택(4-6개 항목), 견적, 개발 기간, 우선순위로 구성
3. 개발 범위는 프로젝트 설명의 구체적인 요구사항을 반영하여 기술적으로 상세하게 작성
4. 각 개발 범위 항목은 구체적인 기능명, 시스템명을 포함해야 함
5. 기술 스택은 각 단계에서 사용되는 프로그래밍 언어, 프레임워크, 라이브러리, 도구 등을 구체적으로 명시
6. 일반적인 내용(예: "프로젝트 요구사항 분석", "기본 구조 설계")보다는 프로젝트 특화된 구체적인 기능과 기술을 명시
7. 견적은 원화로 단일 금액으로 표시 (예: ₩50,000,000원) - 범위 형식 사용 금지
8. 개발 기간은 "3~4개월" 형식으로 표시
9. 우선순위는 각 단계의 중요도와 실행 순서를 고려하여 "1순위", "2순위", "3순위" 형식으로 설정 (프로젝트 특성에 맞게 판단)
10. 프로젝트 설명을 철저히 분석하여 논리적인 단계로 나누기
11. 각 단계는 독립적으로 완성 가능한 단위로 구성
12. 통합 패키지 옵션 3개 생성 (옵션 A, B, C)
13. 유지보수 섹션: 무상 하자보수, 유지보수 비용(연간), 추가 개발 항목을 포함
14. 특이사항 섹션: 프로젝트에 특별히 주의해야 할 사항, 제약 조건, 추가 협의 사항 등을 포함
15. JSON 형식으로 응답

개발 범위 작성 가이드:
- 프로젝트 설명에 언급된 모든 주요 기능을 개발 범위에 포함
- 기술 스택, 라이브러리, API, 시스템명을 구체적으로 명시
- 각 항목은 독립적으로 이해 가능하고 구체적이어야 함

단계 구성 예시:
- 1단계: AI 모더레이터 솔루션 (1:1 인터뷰)
- 2단계: 디지털 트윈 (AI 페르소나) 솔루션
- 3단계: 데이터 통합 검색 솔루션 (LLM 기반)

통합 패키지 구성:
- 옵션 A: 1단계 + 2단계
- 옵션 B: 1단계 + 3단계
- 옵션 C: 전체 (1+2+3단계)

응답 형식:
{
  "phases": [
    {
      "phaseNumber": 1,
      "phaseName": "단계명",
      "developmentScope": ["개발 범위 항목 1", "개발 범위 항목 2", ...],
      "techStack": ["기술 스택 1", "기술 스택 2", "기술 스택 3", "기술 스택 4"],
      "estimate": "₩50,000,000원",
      "period": "2~3개월",
      "priority": "1순위"
    },
    ...
  ],
  "packages": [
    {
      "name": "옵션 A: [패키지명 A]",
      "estimate": "₩90,000,000원",
      "period": "3~4개월"
    },
    ...
  ],
  "maintenance": {
    "warranty": "무상 하자보수 내용 (예: 개발 완료 후 6개월간 무상 하자보수 제공)",
    "annualCost": ["유지보수 비용 항목 1 (예: 연간 유지보수 비용: 총 개발비의 15%)", "유지보수 비용 항목 2"],
    "additionalDevelopment": ["추가 개발 항목 1 (예: 신규 기능 추가 시 별도 협의)", "추가 개발 항목 2"]
  },
  "specialNotes": [
    "특이사항 1 (예: 외부 API 연동 시 별도 비용 발생 가능)",
    "특이사항 2 (예: 서버 인프라 비용은 별도 협의)",
    "특이사항 3 (예: 디자인 수정은 3회까지 무상 제공)"
  ]
}`;

    const userPrompt = `프로젝트명: ${projectName}
프로젝트 설명: ${projectDescription}
${budget ? `예산: ${budget}` : '예산: 미지정 (프로젝트 규모에 맞게 설정)'}
${timeline && timeline !== '협의' ? `개발 기간: ${timeline}` : '개발 기간: 협의'}
추가 요구사항: ${additionalRequirements || '없음'}
${aiPrompt ? '\n추가 지시사항: ' + aiPrompt : ''}
${uploadedFileContent ? '\n\n참고 파일 내용:\n' + uploadedFileContent : ''}

위 정보를 바탕으로 단계별 개발 비용 견적을 생성해주세요.

중요:
- 프로젝트 설명에 명시된 모든 구체적인 기능, 기술, 시스템을 개발 범위에 반영하세요.
- 각 단계의 개발 범위는 최소 10개 이상, 가능하면 15개까지 상세하게 작성해주세요.
- 개발 범위 항목은 프로젝트 설명의 구체적인 요구사항을 그대로 반영하여 작성하세요.
- 예를 들어 프로젝트 설명에 "AI 모더레이터", "STT", "벡터 DB", "RAG" 등이 언급되어 있다면 이를 구체적인 개발 범위 항목으로 작성하세요.
- 각 항목은 기술적으로 구체적이고 명확하게 작성하세요 (예: "AI 모더레이터 엔진 개발", "실시간 음성 인식 및 텍스트 변환 (STT)").
- 일반적인 개발 프로세스 항목보다는 프로젝트 특화된 기능과 기술을 우선적으로 포함하세요.
- 단계명도 프로젝트의 핵심 기능을 반영하여 명확하게 작성하세요 (예: "1단계: AI 모더레이터 솔루션").`;

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
                    // Always start from current year
                    startYear = currentYear;
                    
                    // Check if the start date is before minimum start date
                    const startDateObj = new Date(currentYear, startMonth - 1, startDay);
                    if (startDateObj < minStartDate) {
                        // Use minimum start date (7 days from today)
                        startYear = minStartYear;
                        startMonth = minStartMonth;
                        startDay = minStartDay;
                    } else {
                        // If month/day is in the past (but after minStartDate), it's already in the future
                        // Keep current year
                        startYear = currentYear;
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
                
                // Determine correct year based on current date
                const today = new Date();
                const baseYear = today.getFullYear();
                const minStartDate = new Date(today);
                minStartDate.setDate(minStartDate.getDate() + 7);
                
                // Start date: use current year, but ensure it's at least 7 days from today
                let startYear = baseYear;
                const startDateObj = new Date(baseYear, startMonth - 1, startDay);
                if (startDateObj < minStartDate) {
                    // Use minimum start date year (should be same as baseYear unless year rollover)
                    startYear = minStartDate.getFullYear();
                } else {
                    // Date is already in the future, keep current year
                    startYear = baseYear;
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
async function callOpenAIAPI(apiKey, systemPrompt, userPrompt, useJSON = true, maxTokens = 2000) {
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
        max_tokens: maxTokens
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
    
    // 단계별 견적서인지 확인
    const isPhaseBased = element && (
        element.innerHTML.includes('단계별 개발 비용 견적') || 
        element.querySelector('.estimate-phase-section') !== null ||
        element.innerHTML.includes('estimate-phase-section')
    );
    
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
    // 1. 먼저 입력 필드에서 가져오기
    let projectName = document.getElementById('projectName')?.value?.trim();
    
    // 2. 입력 필드에 없으면 생성된 HTML에서 추출
    if (!projectName && element) {
        // 프로젝트명 추출 시도 (여러 형식 지원)
        const projectNameSelectors = [
            '.estimate-info-value', // 일반 견적서
            '.estimate-table td', // 테이블 형식
            '.estimate-phase-title' // 단계별 견적서 (첫 번째 단계명 사용)
        ];
        
        for (const selector of projectNameSelectors) {
            const elements = element.querySelectorAll(selector);
            for (const el of elements) {
                const text = el.textContent?.trim();
                // "프로젝트명" 라벨 다음에 오는 값 찾기
                if (text && text.length > 0 && text.length < 100 && !text.includes('원') && !text.includes('일정')) {
                    // 프로젝트명으로 보이는 값인지 확인
                    const prevText = el.previousElementSibling?.textContent || '';
                    const parentText = el.parentElement?.textContent || '';
                    if (prevText.includes('프로젝트명') || parentText.includes('프로젝트명')) {
                        projectName = text;
                        break;
                    }
                }
            }
            if (projectName) break;
        }
        
        // 단계별 견적서인 경우 첫 번째 단계명에서 추출
        if (!projectName && isPhaseBased) {
            const firstPhaseTitle = element.querySelector('.estimate-phase-title');
            if (firstPhaseTitle) {
                const phaseText = firstPhaseTitle.textContent?.trim() || '';
                // "1단계: 단계명" 형식에서 단계명 추출
                const match = phaseText.match(/\d+단계:\s*(.+)/);
                if (match && match[1]) {
                    projectName = match[1].trim();
                }
            }
        }
    }
    
    // 3. 여전히 없으면 기본값 사용
    if (!projectName) {
        projectName = '프로젝트';
    }
    
    // 파일명에 사용할 수 없는 문자 제거
    projectName = projectName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    
    const filename = `[포너즈] ${projectName}_견적서.pdf`;
    
    // 단계별 견적서는 독립적인 PDF 출력 로직 사용
    const opt = isPhaseBased ? {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 3,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: false,
            foreignObjectRendering: false,
            ignoreElements: function(element) {
                // PDF 다운로드 버튼 제외
                return element.classList && element.classList.contains('download-btn');
            },
            onclone: function(clonedDoc) {
                // 복제된 문서에서 테이블 스타일 강제 적용
                const tables = clonedDoc.querySelectorAll('.estimate-table');
                tables.forEach(table => {
                    table.style.borderCollapse = 'collapse';
                    table.style.borderSpacing = '0';
                    const cells = table.querySelectorAll('td, th');
                    cells.forEach(cell => {
                        cell.style.border = '1px solid #ccc';
                        cell.style.borderCollapse = 'collapse';
                    });
                });
                
                // estimate-container 스타일 최적화
                const containers = clonedDoc.querySelectorAll('.estimate-container');
                containers.forEach(container => {
                    container.style.width = '100%';
                    container.style.maxWidth = '100%';
                    container.style.margin = '0';
                    container.style.padding = '20px';
                    container.style.background = '#ffffff';
                });
                
                // 단계별 견적서: "단계별 개발 비용 견적" 제목과 1단계 섹션 사이 간격 최소화
                const phaseTitles = clonedDoc.querySelectorAll('.estimate-section-title');
                const firstPhaseSection = clonedDoc.querySelector('.estimate-phase-section');
                
                phaseTitles.forEach(title => {
                    if (title.textContent && title.textContent.includes('단계별 개발 비용 견적')) {
                        // 제목의 margin-bottom 최소화
                        title.style.setProperty('margin-bottom', '0', 'important');
                        title.style.setProperty('padding-bottom', '0', 'important');
                        title.style.setProperty('page-break-after', 'avoid', 'important');
                        title.style.setProperty('break-after', 'avoid', 'important');
                    }
                });
                
                // 모든 단계 섹션에 page-break-inside: auto를 매우 강력하게 적용
                // styles.css의 page-break-inside: avoid를 덮어쓰기 위해 인라인 스타일로 직접 설정
                const phaseSections = clonedDoc.querySelectorAll('.estimate-phase-section');
                
                // 스타일시트에 직접 CSS 규칙 추가 (매우 강력하게)
                const styleSheet = clonedDoc.createElement('style');
                styleSheet.textContent = `
                    @media print {
                        .estimate-phase-section {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                            -webkit-region-break-inside: auto !important;
                        }
                        .estimate-phase-section * {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                            -webkit-region-break-inside: auto !important;
                        }
                        .estimate-phase-section:first-of-type {
                            page-break-before: auto !important;
                            break-before: auto !important;
                            margin-top: 0 !important;
                        }
                    }
                    .estimate-phase-section {
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                        -webkit-region-break-inside: auto !important;
                    }
                    .estimate-phase-section * {
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                        -webkit-region-break-inside: auto !important;
                    }
                    .estimate-phase-section:first-of-type {
                        page-break-before: auto !important;
                        break-before: auto !important;
                        margin-top: 0 !important;
                    }
                `;
                clonedDoc.head.appendChild(styleSheet);
                
                phaseSections.forEach((section, index) => {
                    // 기존 인라인 스타일 가져오기
                    let currentStyle = section.getAttribute('style') || '';
                    
                    // page-break-inside: auto를 인라인 스타일로 직접 추가 (가장 강력한 방법)
                    if (!currentStyle.includes('page-break-inside')) {
                        currentStyle += '; page-break-inside: auto !important; break-inside: auto !important;';
                    } else {
                        // 기존 page-break-inside를 auto로 교체
                        currentStyle = currentStyle.replace(/page-break-inside:\s*[^;]+/gi, 'page-break-inside: auto !important');
                        currentStyle = currentStyle.replace(/break-inside:\s*[^;]+/gi, 'break-inside: auto !important');
                        if (!currentStyle.includes('page-break-inside: auto')) {
                            currentStyle += '; page-break-inside: auto !important; break-inside: auto !important;';
                        }
                    }
                    section.setAttribute('style', currentStyle);
                    
                    // setProperty로도 추가 적용
                    section.style.setProperty('page-break-inside', 'auto', 'important');
                    section.style.setProperty('break-inside', 'auto', 'important');
                    
                    // 첫 번째 단계 섹션 추가 처리
                    if (index === 0) {
                        let firstStyle = section.getAttribute('style') || '';
                        firstStyle += '; margin-top: 0 !important; padding-top: 5px !important; page-break-before: auto !important; break-before: auto !important;';
                        section.setAttribute('style', firstStyle);
                        section.style.setProperty('margin-top', '0', 'important');
                        section.style.setProperty('padding-top', '5px', 'important');
                        section.style.setProperty('page-break-before', 'auto', 'important');
                        section.style.setProperty('break-before', 'auto', 'important');
                        section.classList.add('first-phase-section');
                    }
                    
                    // 모든 하위 요소에도 page-break-inside: auto 강제 적용
                    const children = section.querySelectorAll('*');
                    children.forEach(child => {
                        let childStyle = child.getAttribute('style') || '';
                        // 기존 page-break-inside 제거 후 auto로 설정
                        childStyle = childStyle.replace(/page-break-inside:\s*[^;!]+[!important]*/gi, '');
                        childStyle = childStyle.replace(/break-inside:\s*[^;!]+[!important]*/gi, '');
                        childStyle += '; page-break-inside: auto !important; break-inside: auto !important;';
                        child.setAttribute('style', childStyle);
                        child.style.setProperty('page-break-inside', 'auto', 'important');
                        child.style.setProperty('break-inside', 'auto', 'important');
                    });
                });
                
                // html2pdf.js가 CSS를 무시할 수 있으므로, 모든 방법으로 강제 적용
                phaseSections.forEach((section, index) => {
                    // data 속성으로도 표시
                    section.setAttribute('data-page-break-inside', 'auto');
                    if (index === 0) {
                        section.setAttribute('data-page-break-before', 'auto');
                    }
                    
                    // 최종적으로 인라인 스타일로 직접 설정 (가장 강력)
                    let finalStyle = section.getAttribute('style') || '';
                    // 기존 page-break 관련 스타일 제거
                    finalStyle = finalStyle.replace(/page-break-inside[^;]*/gi, '').replace(/break-inside[^;]*/gi, '');
                    // auto로 강제 설정
                    finalStyle += ' page-break-inside: auto !important; break-inside: auto !important;';
                    section.setAttribute('style', finalStyle);
                });
            }
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
        },
    } : {
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

// AI 채팅 기능
let chatHistory = [];

// 채팅 모달 토글
function toggleChat() {
    const chatModal = document.getElementById('chatModal');
    if (chatModal) {
        chatModal.classList.toggle('active');
        if (chatModal.classList.contains('active')) {
            // 채팅 모달이 열릴 때 입력창에 포커스
            setTimeout(() => {
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 100);
        } else {
            // 채팅 모달이 닫힐 때 히스토리 초기화하지 않음 (유지)
        }
    }
}

// 채팅 메시지 전송
async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatInput || !chatMessages) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // 현재 견적서가 없으면 경고
    if (!currentHtmlCode || currentHtmlCode.trim() === '') {
        addChatMessage('bot', '먼저 견적서를 생성해주세요. 견적서가 생성된 후에 수정 요청을 할 수 있습니다.');
        return;
    }
    
    // 사용자 메시지 추가
    addChatMessage('user', message);
    chatInput.value = '';
    
    // 로딩 메시지 추가
    const loadingId = addChatMessage('bot', '수정 중입니다...', true);
    
    try {
        // 채팅 히스토리에 사용자 메시지 추가
        chatHistory.push({ role: 'user', content: message });
        
        // AI를 통해 견적서 수정 (히스토리 포함)
        const modifiedHtml = await modifyEstimateWithAI(message, currentHtmlCode, chatHistory);
        
        // 로딩 메시지 제거
        removeChatMessage(loadingId);
        
        if (modifiedHtml) {
            // 견적서 업데이트
            currentHtmlCode = modifiedHtml;
            updatePreviewFromCode(modifiedHtml);
            
            // 코드 에디터 업데이트
            if (codeEditor) {
                codeEditor.setValue(modifiedHtml);
            } else {
                const htmlCodeEditor = document.getElementById('htmlCodeEditor');
                if (htmlCodeEditor) {
                    htmlCodeEditor.value = modifiedHtml;
                }
            }
            
            // 채팅 히스토리에 AI 응답 추가
            chatHistory.push({ role: 'assistant', content: '견적서가 성공적으로 수정되었습니다.' });
            
            addChatMessage('bot', '견적서가 성공적으로 수정되었습니다! 미리보기를 확인해주세요.');
        } else {
            addChatMessage('bot', '수정에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        console.error('채팅 오류:', error);
        removeChatMessage(loadingId);
        addChatMessage('bot', `오류가 발생했습니다: ${error.message}`);
    }
}

// 채팅 메시지 추가
function addChatMessage(sender, content, isLoading = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;
    
    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `chat-message ${sender} ${isLoading ? 'loading' : ''}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content.replace(/\n/g, '<br>');
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 맨 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

// 채팅 메시지 제거
function removeChatMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

// AI를 통한 견적서 수정
async function modifyEstimateWithAI(userRequest, currentHtml, history = []) {
    const apiKey = window.CONFIG?.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }
    
    // 특정 패키지 수정 요청인지 확인
    const lowerRequest = userRequest.toLowerCase();
    const isPackageSpecific = lowerRequest.includes('기본형') || lowerRequest.includes('표준형') || lowerRequest.includes('프리미엄형') || 
                              lowerRequest.includes('기본') || lowerRequest.includes('표준') || lowerRequest.includes('프리미엄');
    
    // 특정 패키지만 수정하는 경우
    if (isPackageSpecific) {
        try {
            return await updateSpecificPackage(userRequest, currentHtml, history);
        } catch (error) {
            console.log('특정 패키지 수정 실패, 전체 수정으로 전환:', error);
        }
    }
    
    // 복잡한 수정은 AI를 통해 처리 (히스토리 포함)
    const systemPrompt = `당신은 견적서 수정 전문가입니다. 사용자의 요청에 따라 현재 견적서의 특정 부분만 수정해주세요.

중요 규칙:
1. 사용자가 요청한 부분만 정확히 수정하세요
2. 나머지 부분은 그대로 유지하세요
3. HTML 구조와 스타일을 보존하세요
4. 수정된 전체 HTML을 반환하세요
5. JSON 형식이 아닌 순수 HTML만 반환하세요
6. 응답은 가능한 한 간결하게, HTML만 반환하세요
7. 이전 대화 맥락을 고려하여 사용자의 의도를 파악하세요
8. "이번엔", "이제", "다시" 같은 표현은 이전 대화를 참조하는 것입니다

수정 가능한 항목:
- 프로젝트명
- 프로젝트 설명/개요
- 클라이언트명
- 금액/가격 (특정 패키지만 수정 가능)
- 개발 기간/일정
- 기능 목록
- 패키지 옵션
- 개발 단계/일정
- 기타 견적서 내용

패키지 수정 시:
- "기본형만", "기본형 패키지만" 등으로 특정 패키지만 수정
- "프리미엄 가격이 너무 높아" 후 "이번엔 너무 낮아"는 프리미엄 가격을 의미

응답 형식:
수정된 전체 HTML 코드만 반환하세요. 설명이나 JSON 없이 HTML만 반환합니다.`;

    // 이전 대화 맥락 포함
    let contextPrompt = '';
    if (history.length > 0) {
        const recentHistory = history.slice(-4); // 최근 4개 메시지만 포함
        contextPrompt = `이전 대화 맥락:\n${recentHistory.map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\n')}\n\n`;
    }
    
    // 현재 HTML을 간단히 요약하여 전달 (전체 HTML 대신)
    const userPrompt = `${contextPrompt}현재 견적서의 주요 내용:
${extractKeyInfo(currentHtml)}

사용자 요청:
${userRequest}

위 요청에 따라 견적서를 수정해주세요. 수정된 전체 HTML 코드만 반환하세요.`;

    try {
        // HTML 응답이므로 더 큰 max_tokens 사용하되, 더 빠른 모델 사용
        const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt, false, 4000);
        
        // HTML 추출 (마크다운 코드 블록 제거)
        let html = response.trim();
        
        // 마크다운 코드 블록 제거
        html = html.replace(/```html\n?/g, '');
        html = html.replace(/```\n?/g, '');
        html = html.trim();
        
        // HTML이 유효한지 확인
        if (!html.includes('<div') && !html.includes('<table')) {
            // HTML 태그가 없으면 현재 HTML의 구조를 유지하면서 내용만 수정
            return modifyHtmlContent(currentHtml, userRequest, response);
        }
        
        return html;
    } catch (error) {
        console.error('AI 수정 오류:', error);
        throw error;
    }
}

// 특정 패키지만 수정
async function updateSpecificPackage(userRequest, currentHtml, history = []) {
    const apiKey = window.CONFIG?.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }
    
    const lowerRequest = userRequest.toLowerCase();
    
    // 어떤 패키지인지 확인
    let targetPackage = null;
    if (lowerRequest.includes('기본형') || lowerRequest.includes('기본')) {
        targetPackage = 'basic';
    } else if (lowerRequest.includes('표준형') || lowerRequest.includes('표준')) {
        targetPackage = 'standard';
    } else if (lowerRequest.includes('프리미엄형') || lowerRequest.includes('프리미엄')) {
        targetPackage = 'premium';
    } else if (history.length > 0) {
        // 이전 대화에서 패키지 정보 추출
        const lastUserMessage = history.filter(h => h.role === 'user').pop()?.content || '';
        const lastLower = lastUserMessage.toLowerCase();
        if (lastLower.includes('프리미엄')) {
            targetPackage = 'premium';
        } else if (lastLower.includes('기본')) {
            targetPackage = 'basic';
        } else if (lastLower.includes('표준')) {
            targetPackage = 'standard';
        }
    }
    
    if (!targetPackage) {
        throw new Error('수정할 패키지를 확인할 수 없습니다.');
    }
    
    const systemPrompt = `당신은 견적서 수정 전문가입니다. 사용자의 요청에 따라 특정 패키지의 가격만 수정해주세요.

중요 규칙:
1. ${targetPackage === 'basic' ? '기본형' : targetPackage === 'standard' ? '표준형' : '프리미엄형'} 패키지의 가격만 수정하세요
2. 다른 패키지나 견적서의 다른 부분은 절대 수정하지 마세요
3. HTML 구조와 스타일을 보존하세요
4. 수정된 전체 HTML을 반환하세요
5. JSON 형식이 아닌 순수 HTML만 반환하세요

패키지 선택자:
- 기본형: .estimate-package-section 내에서 "기본형 패키지" 텍스트가 있는 섹션
- 표준형: .estimate-package-section 내에서 "표준형 패키지" 텍스트가 있는 섹션
- 프리미엄형: .estimate-package-section 내에서 "프리미엄형 패키지" 텍스트가 있는 섹션

응답 형식:
수정된 전체 HTML 코드만 반환하세요. 설명이나 JSON 없이 HTML만 반환합니다.`;
    
    // 이전 대화 맥락 포함
    let contextPrompt = '';
    if (history.length > 0) {
        const recentHistory = history.slice(-4);
        contextPrompt = `이전 대화 맥락:\n${recentHistory.map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\n')}\n\n`;
    }
    
    const userPrompt = `${contextPrompt}현재 견적서 HTML:
${currentHtml}

사용자 요청:
${userRequest}

위 요청에 따라 ${targetPackage === 'basic' ? '기본형' : targetPackage === 'standard' ? '표준형' : '프리미엄형'} 패키지의 가격만 수정해주세요. 다른 부분은 절대 수정하지 마세요. 수정된 전체 HTML 코드만 반환하세요.`;
    
    try {
        const response = await callOpenAIAPI(apiKey, systemPrompt, userPrompt, false, 4000);
        
        let html = response.trim();
        html = html.replace(/```html\n?/g, '');
        html = html.replace(/```\n?/g, '');
        html = html.trim();
        
        if (!html.includes('<div') && !html.includes('<table')) {
            return modifyHtmlContent(currentHtml, userRequest, response);
        }
        
        return html;
    } catch (error) {
        console.error('특정 패키지 수정 오류:', error);
        throw error;
    }
}

// 주요 정보만 추출 (컨텍스트 크기 줄이기)
function extractKeyInfo(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const info = {
        projectName: tempDiv.querySelector('.estimate-info-value')?.textContent || '',
        totalAmount: tempDiv.querySelector('.estimate-summary-total span:last-child')?.textContent || '',
        items: Array.from(tempDiv.querySelectorAll('.estimate-table tbody tr')).slice(0, 5).map(tr => {
            const cells = tr.querySelectorAll('td');
            return cells.length >= 3 ? `${cells[0].textContent}: ${cells[2].textContent}` : '';
        }).filter(Boolean).join(', ')
    };
    
    return `프로젝트명: ${info.projectName}\n총액: ${info.totalAmount}\n주요 항목: ${info.items}`;
}

// HTML 내용 수정 헬퍼 함수
function modifyHtmlContent(originalHtml, userRequest, aiResponse) {
    // AI 응답에서 수정할 내용 추출
    // 간단한 패턴 매칭으로 수정
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHtml;
    
    // 사용자 요청 분석
    const lowerRequest = userRequest.toLowerCase();
    
    // 프로젝트명 수정
    if (lowerRequest.includes('프로젝트명') || lowerRequest.includes('프로젝트 이름')) {
        const nameMatch = aiResponse.match(/프로젝트명[:\s]*([^\n<]+)/i) || 
                         userRequest.match(/프로젝트명[:\s]*([^\n]+)/i);
        if (nameMatch) {
            const newName = nameMatch[1].trim();
            originalHtml = originalHtml.replace(
                /<div[^>]*class="[^"]*info-value[^"]*"[^>]*>([^<]*프로젝트명[^<]*)<\/div>/i,
                `<div class="info-value">${newName}</div>`
            );
        }
    }
    
    // 가격 수정
    if (lowerRequest.includes('가격') || lowerRequest.includes('금액') || lowerRequest.includes('비용')) {
        const priceMatch = aiResponse.match(/(\d{1,3}(?:,\d{3})*(?:,\d{3})*)\s*원/g) || 
                          userRequest.match(/(\d{1,3}(?:,\d{3})*(?:,\d{3})*)\s*원/g);
        if (priceMatch) {
            const newPrice = priceMatch[0];
            // 가격 관련 부분 수정
            originalHtml = originalHtml.replace(
                /(\d{1,3}(?:,\d{3})*(?:,\d{3})*)\s*원/g,
                newPrice
            );
        }
    }
    
    // 더 정교한 수정을 위해 AI 응답을 파싱하여 적용
    // 여기서는 간단한 버전만 구현하고, 실제로는 AI가 전체 HTML을 반환하도록 함
    
    return originalHtml;
}

// Enter 키로 메시지 전송
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load default estimate template
    loadDefaultEstimate();
    
    // Initialize CodeMirror after a short delay to ensure DOM is ready
    setTimeout(initializeCodeEditor, 100);
});
