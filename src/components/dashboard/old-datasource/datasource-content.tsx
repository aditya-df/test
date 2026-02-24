import React from 'react'

// Props interface to accept data from page component
interface DatasourceContentProps {
    credentials?: {
        id: string;
        name: string;
        description: string | null;
        credentialFile: string | null;
    }[];
}

export const DatasourceContent = ({ credentials = [] }: DatasourceContentProps) => {
    return (
        <div className="flex items-center justify-center h-screen w-full">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-6">Knowledge Base</h1>
                <div className="overflow-x-auto shadow-lg rounded-lg">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">ID</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Title</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Category</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className='text-left'>
                            {credentials.length > 0 ? (
                                credentials.map((credential, index) => (
                                    <tr key={credential.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">{`KB${String(index + 1).padStart(3, '0')}`}</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">{credential.name}</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">{credential.description || 'General'}</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Apr {10 - index}, 2025</td>
                                    </tr>
                                ))
                            ) : (
                                <>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">KB001</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Getting Started Guide</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Onboarding</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Apr 8, 2025</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">KB002</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Troubleshooting Common Issues</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Support</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Apr 5, 2025</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">KB003</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Advanced Configuration</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Technical</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Apr 2, 2025</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">KB004</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">User Permissions Guide</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Administration</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Mar 30, 2025</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">KB005</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Security Best Practices</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Security</td>
                                        <td className="px-6 py-4 border-b border-gray-200 text-sm">Mar 25, 2025</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}