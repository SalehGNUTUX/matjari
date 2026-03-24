// print-handler.js
const { ipcRenderer } = require('electron');

class PrintHandler {
    constructor() {
        this.setupListeners();
    }

    setupListeners() {
        // استقبال أمر الطباعة من النافذة الرئيسية
        window.addEventListener('message', (event) => {
            if (event.data.type === 'print-invoice') {
                this.handlePrint(event.data.content);
            }
        });
    }

    async handlePrint(content) {
        try {
            // إنشاء نافذة طباعة مخفية
            const printWindow = window.open('', '_blank', 'width=800,height=600,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes');

            // كتابة محتوى الفاتورة في النافذة الجديدة
            printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
            <meta charset="UTF-8">
            <title>طباعة الفاتورة</title>
            <style>
            @media print {
                body {
                    font-family: 'Ubuntu Arabic', sans-serif;
                    margin: 0;
                    padding: 5mm;
                }
                .no-print { display: none; }
                button { display: none; }
            }
            ${content.style || ''}
            </style>
            </head>
            <body>
            ${content.html}
            <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print();window.close()"
            style="padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🖨️ طباعة الفاتورة
            </button>
            <button onclick="window.close()"
            style="padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
            ❌ إلغاء
            </button>
            </div>
            <script>
            // الطباعة التلقائية إذا طلبها المستخدم
            window.onload = function() {
                if (${content.autoPrint || false}) {
                    window.print();
                }
            }
            </script>
            </body>
            </html>
            `);

            printWindow.document.close();

        } catch (error) {
            console.error('❌ فشل الطباعة:', error);
            alert('حدث خطأ في الطباعة. يرجى المحاولة مرة أخرى.');
        }
    }
}

// تهيئة معالج الطباعة
window.printHandler = new PrintHandler();
