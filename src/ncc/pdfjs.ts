// Único ponto do app que importa o pdf.js. O worker é empacotado pelo Vite (sem CDN).
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

export { getDocument }
