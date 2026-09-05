import {defineConfig} from 'vite';
import vinext from 'vinext';
import tailwindcss from '@tailwindcss/postcss';
export default defineConfig({plugins:[vinext()],css:{postcss:{plugins:[tailwindcss()]}}});
