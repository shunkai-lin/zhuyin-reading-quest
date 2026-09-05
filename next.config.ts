import type {NextConfig} from 'next';
const nextConfig:NextConfig={output:'export',basePath:process.env.GITHUB_ACTIONS?'/zhuyin-reading-quest':'',trailingSlash:true};
export default nextConfig;
