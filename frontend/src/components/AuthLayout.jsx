import { Link } from "react-router-dom";

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        OwlEye
                    </h1>
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
                        {title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {subtitle}
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
