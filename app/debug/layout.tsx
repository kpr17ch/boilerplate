import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={5000} />
      {children}
    </div>
  );
}
