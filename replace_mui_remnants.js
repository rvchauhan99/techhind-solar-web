const fs = require('fs');
const path = '/Users/ravatrajsinhchauhan/Documents/Programs/techHind/techhind-solar-web/src/app/company-profile/page.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove @mui/material import
content = content.replace(/import \{\s*Alert,\s*CircularProgress,\s*IconButton,\s*\} from "@mui\/material";\n?/m, '');

// 2. Replace CircularProgress
content = content.replace(
    /style=\{\{ display: 'flex', justifyContent: 'center', p: 3 \}\}>\s*<CircularProgress \/>/g,
    'className="flex justify-center p-6">\n                    <Loader />'
);

// 3. Replace Alerts
content = content.replace(
    /<Alert severity="success" sx=\{\{ mb: 2 \}\} onClose=\{\(\) => setSuccess\(""\)\}>\s*\{success\}\s*<\/Alert>/g,
    `<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{success}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccess("")}>
                            <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                        </span>
                    </div>`
);

content = content.replace(
    /<Alert severity="error" sx=\{\{ mb: 2 \}\} onClose=\{\(\) => setError\(""\)\}>\s*\{error\}\s*<\/Alert>/g,
    `<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError("")}>
                            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                        </span>
                    </div>`
);

fs.writeFileSync(path, content);
console.log('Replaced MUI remnants');
