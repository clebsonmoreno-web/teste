import {defineConfig} from 'vite';
import path from 'node:path';
export default defineConfig({root:path.resolve('web'),publicDir:false,build:{outDir:path.resolve('web-dist'),emptyOutDir:true},server:{fs:{allow:[process.cwd()]}}});
