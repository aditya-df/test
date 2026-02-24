"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language: string
  showCopy?: boolean
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, showCopy = true }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'json':
        return 'text-yellow-400'
      case 'bash':
      case 'shell':
        return 'text-green-400'
      case 'javascript':
      case 'js':
        return 'text-blue-400'
      case 'typescript':
      case 'ts':
        return 'text-blue-300'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className={`text-sm font-mono ${getLanguageColor(language)}`}>
            {language}
          </span>
          {showCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 px-2 text-gray-400 hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap break-all">
            <code className="font-mono">{code}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export default CodeBlock
