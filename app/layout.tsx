import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata = {
  title: "Fashion AI | KI-gestützte Modesuche",
  description: "Finde Designermode und Vintage-Kleidung mit Hilfe künstlicher Intelligenz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-gradient-to-b from-black via-gray-900 to-black min-h-screen">
        <div className="fixed inset-0 bg-repeat opacity-5 z-0 pointer-events-none"></div>
        <div className="fixed inset-0 bg-gradient-to-tr from-[#5E6AD2]/5 to-transparent opacity-30 z-0 pointer-events-none"></div>
        <div className="fixed inset-0 bg-repeat opacity-[0.02] z-0 pointer-events-none mix-blend-overlay"></div>
        
        <div className="relative z-10">
          {children}
        </div>
        <ToastContainer 
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          toastClassName="bg-gray-900 border border-white/10 backdrop-blur-md"
        />
      </body>
    </html>
  );
}
