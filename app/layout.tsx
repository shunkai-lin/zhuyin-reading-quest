import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'注音闖關樂｜一年級朗讀練習',description:'看字與注音，聽示範，再開口讀。從50個字、50個詞到生活短句。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant-TW"><body>{children}</body></html>;}
