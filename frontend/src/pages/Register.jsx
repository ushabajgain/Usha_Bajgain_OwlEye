import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { Mail, Lock, User, Phone, Loader2 } from "lucide-react";

const Register = () => {
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
        phone_number: "",
        role: "ATTENDEE"
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        setError("");
        setIsSubmitting(true);

        const result = await register(formData);
        if (result.success) {
            navigate("/login");
        } else {
            // Handle various error formats from DRF
            const errorMsg = typeof result.error === 'object'
                ? Object.entries(result.error).map(([k, v]) => `${k}: ${v}`).join(', ')
                : result.error;
            setError(errorMsg || "Registration failed");
        }
        setIsSubmitting(false);
    };

    return (
        <AuthLayout
            title="Create your account"
            subtitle={
                <>
                    Already have an account? <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
                </>
            }
        >
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-4 rounded-md shadow-sm">
                    {/* Full Name */}
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            name="full_name"
                            type="text"
                            required
                            className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                            placeholder="Full Name"
                            value={formData.full_name}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            name="email"
                            type="email"
                            required
                            className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Phone */}
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            name="phone_number"
                            type="tel"
                            className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                            placeholder="Phone Number (Optional)"
                            value={formData.phone_number}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Role Selection */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-300 mb-1">I am a...</label>
                        <select
                            name="role"
                            className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-3 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="ATTENDEE">Attendee</option>
                            <option value="ORGANIZER">Organizer</option>
                            <option value="VOLUNTEER">Volunteer</option>
                            <option value="AUTHORITY">Authority</option>
                        </select>
                    </div>

                    {/* Passwords */}
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            name="password"
                            type="password"
                            required
                            className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            name="confirm_password"
                            type="password"
                            required
                            className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                            placeholder="Confirm Password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting && <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />}
                        Create account
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Register;
