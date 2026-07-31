const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface UploadedImage {
    url: string;
    displayUrl: string;
    deleteUrl: string;
}

export const uploadApi = {
    async uploadImage(file: File, token: string): Promise<UploadedImage> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to upload image: ${response.statusText}`);
        }

        return response.json();
    },
};
