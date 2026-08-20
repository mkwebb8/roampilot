import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata:Metadata={title:"RoamPilot RV - Intelligent trip discovery",description:"Complete RV trip ideas matched to your rig, time, and interests.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg"}};
export const viewport:Viewport={themeColor:"#20221f",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
