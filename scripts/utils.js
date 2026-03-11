// 1. Extrae texto crudo de un archivo PDF usando la librería pdf.js
async function extractTextFromPDF(file) {
    if (!window.pdfjsLib) throw new Error("La librería pdf.js no se ha cargado.");
    

    // Conecta a la librería con su "trabajador" para que no se congele
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    
    const fileReader = new FileReader();
    const texto = await new Promise((resolve, reject) => {
        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                let textoAcumulado = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    textoAcumulado += content.items.map(item => item.str).join(" ") + "\n";
                }
                resolve(textoAcumulado.replace(/\s+/g, ' ').trim()); 
            } catch (e) { 
                console.error("Error leyendo el PDF:", e); // Ahora sí veremos si falla
                reject(e); 
            }
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
    return texto;
}
