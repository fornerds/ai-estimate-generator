// Vercel 빌드 시 환경 변수를 config.js로 변환하는 스크립트
const fs = require('fs');
const path = require('path');

const apiKey = process.env.OPENAI_API_KEY || '';

const configContent = `// API 키 설정 파일 (Vercel 환경 변수에서 자동 생성)
const CONFIG = {
    OPENAI_API_KEY: '${apiKey}'
};

// 전역에서 사용할 수 있도록 window 객체에 추가
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
`;

const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✅ config.js 파일이 생성되었습니다.');

