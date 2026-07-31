export function buildWhatsAppUrl(phone: string, message?: string): string {
    const digits = phone.replace(/\D/g, "").replace(/^00/, "");
    const query = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${digits}${query}`;
}
