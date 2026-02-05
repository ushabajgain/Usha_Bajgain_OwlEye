import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Calendar, MapPin, Type, Users } from "lucide-react";
import LocationPicker from "../components/LocationPicker";

const CreateEvent = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [position, setPosition] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "OTHER",
        address: "",
        start_date: "",
        end_date: "",
        capacity: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!position) {
            setError("Please pin a location on the map.");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                location_lat: position.lat,
                location_lng: position.lng,
                status: 'ACTIVE' // Auto publish for now, or add DRAFT option
            };

            await api.post("/events/", payload);
            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data
                ? JSON.stringify(err.response.data)
                : "Failed to create event";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Create New Event
                    </h1>
                    <p className="text-gray-400 mt-1">Fill in the details to publish your event.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Event Title</label>
                            <div className="relative">
                                <Type className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter event title"
                                    value={formData.title}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                            <select
                                name="category"
                                className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-3 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                <option value="CONCERT">Concert</option>
                                <option value="CONFERENCE">Conference</option>
                                <option value="SPORTS">Sports</option>
                                <option value="FESTIVAL">Festival</option>
                                <option value="RALLY">Rally</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Max Capacity</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    name="capacity"
                                    type="number"
                                    required
                                    min="1"
                                    className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 5000"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                            name="description"
                            required
                            rows="4"
                            className="block w-full rounded-md border-0 bg-gray-700/50 p-3 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe the event..."
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Start Date & Time</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    name="start_date"
                                    type="datetime-local"
                                    required
                                    className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">End Date & Time</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    name="end_date"
                                    type="datetime-local"
                                    required
                                    className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Location & Venue</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                                name="address"
                                type="text"
                                required
                                className="block w-full rounded-md border-0 bg-gray-700/50 py-3 pl-10 text-white ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500 mb-4"
                                placeholder="Venue Address Name (e.g. Dashrath Rangasala)"
                                value={formData.address}
                                onChange={handleChange}
                            />
                        </div>

                        <p className="text-sm text-gray-400">Pin the exact location on map:</p>
                        <LocationPicker position={position} setPosition={setPosition} />
                        {position && (
                            <p className="text-xs text-green-400">
                                Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Event"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEvent;
