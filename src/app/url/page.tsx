'use client'
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ScrapedContent: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [content, setContent] = useState<string | null>(null);

    const fetchData = async (url: string) => {
        try {
            const response = await axios.get(`https://app.scrapingbee.com/api/v1?api_key=2V9QGZVWWXRNCKSR0SL0919OUW1EGZABVB36DSTV5ZVYZ4HL23154YSU8Q1VGCG7G6DPOH7HSRYBFRX7&url=${url}`);
            setContent(response.data); // Assuming the content is in response.data.content
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) {
            fetchData(url);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="Enter URL" 
                    required 
                />
                <button type="submit">Fetch Content</button>
            </form>
            {content ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default ScrapedContent;