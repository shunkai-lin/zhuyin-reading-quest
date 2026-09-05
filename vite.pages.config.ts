import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
export default defineConfig({plugins:[react()],base:'./',css:{postcss:{plugins:[tailwindcss()]}},build:{outDir:'dist-pages'},server:{host:'127.0.0.1',port:3001,strictPort:true}});
