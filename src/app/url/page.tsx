'use client'
import React, { useState } from 'react';
import axios from 'axios';

const ScrapedContent: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state

    const fetchData = async (url: string) => {
        setIsLoading(true); // Set loading state
        try {
            const response = await axios.get(`https://app.scrapingbee.com/api/v1?api_key=2V9QGZVWWXRNCKSR0SL0919OUW1EGZABVB36DSTV5ZVYZ4HL23154YSU8Q1VGCG7G6DPOH7HSRYBFRX7&url=${url}`);
            setContent(response.data); // Assuming the content is in response.data.content
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) {
            fetchData(url);
        }
    };

    return (
        <div className="mt-6 p-6 border rounded-lg shadow-md bg-white">
            <form onSubmit={handleSubmit} className="flex gap-4 mb-4">
                <input 
                    type="text" 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="Enter URL" 
                    required 
                    className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                    Fetch Content
                </button>
            </form>
            {isLoading ? (
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            ) : content ? (
                <div className="mt-4 p-4 border rounded-md bg-gray-100">
                    <h2 className="text-lg font-semibold">Fetched Content</h2>
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            ) : (
                <p className="mt-4 text-gray-600">No content fetched yet.</p>
            )}
        </div>
    );
};

export default ScrapedContent;