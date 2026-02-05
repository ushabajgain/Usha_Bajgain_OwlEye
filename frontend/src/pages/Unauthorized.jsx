import { Link } from "react-router-dom";

const Unauthorized = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
            <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-8 text-center max-w-md">
                You do not have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <Link to="/dashboard" className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors">
                Return to Dashboard
            </Link>
        </div>
    );
};

export default Unauthorized;
