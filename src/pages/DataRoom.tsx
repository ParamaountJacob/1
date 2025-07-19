import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
);

const BUCKET = 'tim-data-room';
const USERNAME = 'Admin';
const PASSWORD = '000';

export default function DataRoom() {
    const [authenticated, setAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [requestText, setRequestText] = useState('');
    const [requestSuccess, setRequestSuccess] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [viewingFile, setViewingFile] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (authenticated) fetchFiles();
    }, [authenticated]);

    async function fetchFiles() {
        const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 100 });
        if (error) setError(error.message);
        else setFiles(data ?? []);
    }

    function sanitizeFileName(name: string): string {
        // More aggressive sanitization for Supabase storage
        return name
            .normalize('NFD') // Normalize unicode
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\w.-]/g, '_') // Replace any non-alphanumeric (except dots/hyphens) with underscore
            .replace(/_+/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .toLowerCase(); // Convert to lowercase for consistency
    }

    async function uploadFile(file: File) {
        setUploading(true);
        setError('');

        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${sanitizedName}`;

        console.log('Original filename:', file.name);
        console.log('Sanitized filename:', sanitizedName);
        console.log('Final filename:', fileName);

        const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, { upsert: true });
        setUploading(false);
        if (error) {
            console.error('Upload error:', error);
            setError(error.message);
        } else {
            fetchFiles();
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    }

    function handleDrag(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    }

    async function handleDelete(name: string) {
        if (!window.confirm('Delete this file?')) return;
        const { error } = await supabase.storage.from(BUCKET).remove([name]);
        if (error) setError(error.message);
        else fetchFiles();
    }

    async function handleRequestSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setRequestSuccess(false);
        const { error } = await supabase.from('data_room_requests').insert({
            request: requestText,
            created_at: new Date().toISOString(),
        });
        if (error) setError(error.message);
        else {
            setRequestSuccess(true);
            setRequestText('');
        }
    }

    function handlePasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (username === USERNAME && password === PASSWORD) {
            setAuthenticated(true);
            setError('');
        } else {
            setError('Invalid username or password');
        }
    }

    function openFileViewer(file: any) {
        setViewingFile(file);
    }

    function closeFileViewer() {
        setViewingFile(null);
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
                <div className="bg-black/70 rounded-xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-gold mb-2">Data Room Access</h1>
                        <p className="text-white/70">Enter credentials to continue</p>
                    </div>
                    <form onSubmit={handlePasswordSubmit}>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            className="w-full p-3 rounded bg-gray-800 text-white border border-gold/30 focus:outline-none focus:border-gold mb-3"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full p-3 rounded bg-gray-800 text-white border border-gold/30 focus:outline-none focus:border-gold mb-4"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full px-4 py-3 rounded bg-gold/90 text-black font-semibold hover:bg-yellow-500 transition"
                        >
                            Access Data Room
                        </button>
                    </form>
                    {error && <div className="text-red-400 text-center mt-3 text-sm">{error}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
            <div className="max-w-4xl mx-auto bg-black/70 backdrop-blur-sm rounded-xl shadow-2xl p-8 mt-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gold mb-2">Virtual Data Room</h1>
                        <p className="text-white/80">
                            Secure document repository containing essential business documents, financial statements, legal agreements, and due diligence materials.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-white/60">Files: {files.length}</div>
                        <button
                            onClick={() => setAuthenticated(false)}
                            className="text-xs text-red-400 hover:text-red-600 mt-1"
                        >
                            Exit Room
                        </button>
                    </div>
                </div>

                <div className="mb-8 bg-black/50 rounded-lg p-6 border border-gold/20">
                    <h2 className="text-xl font-semibold text-gold mb-4">What Goes in a Data Room?</h2>
                    <p className="text-white/70 mb-4">A virtual data room contains ALL the documents investors/partners need for due diligence. Think of it as your complete business file cabinet that proves everything you claim about your company.</p>
                    <div className="grid md:grid-cols-2 gap-6 text-white/80">
                        <div>
                            <h3 className="font-semibold text-gold/90 mb-2">📊 Financial Proof</h3>
                            <p className="text-sm mb-2">Show them the money is real:</p>
                            <ul className="text-xs text-white/60 space-y-1">
                                <li>• Bank statements (last 12 months)</li>
                                <li>• Tax returns (last 3 years)</li>
                                <li>• Profit & loss statements</li>
                                <li>• Cash flow projections</li>
                                <li>• Audited financials (if you have them)</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gold/90 mb-2">⚖️ Legal Stuff</h3>
                            <p className="text-sm mb-2">Prove you're legitimate:</p>
                            <ul className="text-xs text-white/60 space-y-1">
                                <li>• Articles of incorporation</li>
                                <li>• Operating agreements</li>
                                <li>• Any major contracts</li>
                                <li>• Insurance policies</li>
                                <li>• Regulatory licenses</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gold/90 mb-2">🏢 Business Operations</h3>
                            <p className="text-sm mb-2">Show how you make money:</p>
                            <ul className="text-xs text-white/60 space-y-1">
                                <li>• Your detailed business plan</li>
                                <li>• Market analysis/research</li>
                                <li>• Customer lists (if allowed)</li>
                                <li>• Key employee contracts</li>
                                <li>• Operational procedures</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gold/90 mb-2">📈 The Sales Pitch</h3>
                            <p className="text-sm mb-2">Get them excited:</p>
                            <ul className="text-xs text-white/60 space-y-1">
                                <li>• Your best pitch deck</li>
                                <li>• Investment memorandum</li>
                                <li>• Market opportunity analysis</li>
                                <li>• Growth projections</li>
                                <li>• Competition analysis</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-gold/10 rounded border border-gold/30">
                        <p className="text-white/80 text-sm"><strong>💡 Pro Tip:</strong> Don't put everything at once. Start with your pitch deck and financials. Add more as investors request specific documents. This lets you control the narrative and see what they're most interested in.</p>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-gold font-semibold mb-3">Upload Files</label>
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragActive
                            ? 'border-gold bg-gold/10 scale-105'
                            : uploading
                                ? 'border-yellow-500/50 bg-yellow-500/5'
                                : 'border-gold/30 hover:border-gold/60 bg-black/30 hover:bg-black/50'
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="text-4xl mb-3">
                            {uploading ? '⏳' : dragActive ? '📥' : '📁'}
                        </div>
                        <div className="text-lg mb-2 text-white">
                            {uploading
                                ? 'Uploading...'
                                : dragActive
                                    ? 'Drop file here'
                                    : 'Drag and drop or click to select'
                            }
                        </div>
                        <div className="text-sm text-white/60">
                            Supports all file types • Auto-timestamps filenames
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gold">Document Library</h2>
                        <button
                            onClick={fetchFiles}
                            className="text-sm px-3 py-1 rounded bg-gold/20 text-gold hover:bg-gold/30 transition"
                        >
                            Refresh
                        </button>
                    </div>
                    <div className="grid gap-3">
                        {files.length === 0 && (
                            <div className="text-center py-8 text-white/60 border border-gold/10 rounded-lg">
                                <div className="text-3xl mb-2">📂</div>
                                <div>No files uploaded yet</div>
                            </div>
                        )}
                        {files.map((f) => (
                            <div
                                key={f.name}
                                className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gold/10 text-white/90 border border-gold/10 hover:border-gold/40 transition-all group"
                            >
                                <div className="text-2xl">
                                    {f.name.includes('.pdf') ? '📄' :
                                        f.name.includes('.doc') ? '📝' :
                                            f.name.includes('.xls') ? '📊' :
                                                f.name.includes('.ppt') ? '📈' :
                                                    f.name.includes('.zip') ? '📦' : '📄'}
                                </div>
                                <div className="flex-1 cursor-pointer"
                                    onClick={() => openFileViewer(f)}>
                                    <div className="font-medium hover:text-gold transition">{f.name.replace(/^\d+_/, '')}</div>
                                    <div className="text-xs text-white/50">
                                        {new Date(f.updated_at || f.created_at).toLocaleDateString()} • Click to view
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openFileViewer(f)}
                                        className="px-3 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                                    >
                                        View
                                    </button>
                                    <a
                                        href={supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl}
                                        download
                                        className="px-3 py-1 text-xs rounded bg-gold/20 text-gold hover:bg-gold/30 transition"
                                    >
                                        Download
                                    </a>
                                    <button
                                        className="px-3 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                        onClick={() => handleDelete(f.name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-black/50 rounded-lg p-6 border border-gold/20">
                    <h3 className="font-semibold text-gold mb-3 flex items-center gap-2">
                        � Document Requests & Inquiries
                    </h3>
                    <form onSubmit={handleRequestSubmit}>
                        <textarea
                            className="w-full p-4 rounded-lg bg-gray-800/70 text-white border border-gold/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 mb-4 transition"
                            placeholder="Request specific documents, ask questions about existing materials, or suggest additional content for this data room..."
                            value={requestText}
                            onChange={e => setRequestText(e.target.value)}
                            rows={4}
                            required
                        />
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-white/50">
                                All requests are logged and reviewed by authorized personnel
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 rounded-lg bg-gold/90 text-black font-semibold hover:bg-yellow-500 transition shadow-lg"
                            >
                                Submit Request
                            </button>
                        </div>
                    </form>
                    {requestSuccess && (
                        <div className="mt-3 p-3 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
                            ✅ Request submitted successfully and will be reviewed promptly.
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                        ⚠️ {error}
                    </div>
                )}

                <div className="text-xs text-white/40 mt-8 border-t border-gold/10 pt-4 text-center">
                    🛡️ This data room is private and confidential. All access is logged. Please do not forward links without authorization.
                </div>
            </div>

            {/* Document Viewer Popup */}
            {viewingFile && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black/90 rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col border border-gold/30">
                        <div className="flex items-center justify-between p-4 border-b border-gold/20">
                            <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                    {viewingFile.name.includes('.pdf') ? '📄' :
                                        viewingFile.name.includes('.doc') ? '📝' :
                                            viewingFile.name.includes('.xls') ? '📊' :
                                                viewingFile.name.includes('.ppt') ? '📈' :
                                                    viewingFile.name.includes('.zip') ? '📦' : '📄'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{viewingFile.name.replace(/^\d+_/, '')}</h3>
                                    <p className="text-sm text-white/60">
                                        {new Date(viewingFile.updated_at || viewingFile.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={supabase.storage.from(BUCKET).getPublicUrl(viewingFile.name).data.publicUrl}
                                    download
                                    className="px-3 py-1 text-sm rounded bg-gold/20 text-gold hover:bg-gold/30 transition"
                                >
                                    Download
                                </a>
                                <button
                                    onClick={closeFileViewer}
                                    className="px-3 py-1 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <iframe
                                src={supabase.storage.from(BUCKET).getPublicUrl(viewingFile.name).data.publicUrl}
                                className="w-full h-full border-0"
                                title={viewingFile.name}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
