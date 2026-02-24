import { useToast } from '@/hooks/use-toast'
import { Data as DatasourceData } from '@/stores/datasource/model'
import { Data as CredentialData } from '@/stores/credential/model'
import { useRef, useState } from 'react'

export const useDropzone = (payload: DatasourceData, setPayload: any) => {
  const allowExtension = ['pdf', 'docx', 'txt', 'xlsx', 'pptx']
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
  const { toast } = useToast()
  const [dragActive, setDragActive] = useState<boolean>(false)
  const inputRef = useRef<any>(null)
  const [files, setFiles] = useState<any>([])

  function handleChange(e: any) {
    e.preventDefault()
    console.log('File has been added')
    if (e.target.files && e.target.files[0]) {
      for (let i = 0; i < e.target.files['length']; i++) {
        if (e.target.files[i].size > MAX_FILE_SIZE) {
          toast({
            title: 'File too large',
            description: `File ${e.target.files[i].name} exceeds maximum size of 20MB`,
            variant: 'destructive',
          })
          return
        }
        setFiles((prevState: any) => [...prevState, e.target.files[i]])
        // setPayload((prev: any) => ({ ...prev, document: [...prev.document, e.target.files[i]] }))
        setPayload((prev: any) => ({
          ...prev,
          document: Array.isArray(prev.document) ? [...prev.document, e.target.files[i]] : [e.target.files[i]]
        }))
      }
    }
  }

  function handleSubmitFile() {
    if (files.length === 0) {
      // no file has been submitted
    } else {
      // write submit logic here
    }
  }

  function handleDrop(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      for (let i = 0; i < e.dataTransfer.files['length']; i++) {
        const file = e.dataTransfer.files[i]
        const filename = e.dataTransfer.files[i].name
        const ext = filename.split('.').pop()
        if (!allowExtension.includes(ext)) {
          toast({
            title: 'Invalid file extension',
            description: `File ${filename} extension is not allowed`,
            variant: 'destructive',
          })
          return
        }
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: 'File too large',
            description: `File ${filename} exceeds maximum size of 20MB`,
            variant: 'destructive',
          })
          return
        }
        setFiles((prevState: any) => [...prevState, e.dataTransfer.files[i]])
        console.log(payload)
        setPayload((prev: any) => ({
          ...prev,
          document: prev.document
            ? [...prev.document, e.dataTransfer.files[i]]
            : [e.dataTransfer.files[i]],
        }))
      }
    }
  }

  function handleDragLeave(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDragOver(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragEnter(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function removeFile(fileName: any, idx: any) {
    const newArr = [...files]
    newArr.splice(idx, 1)
    setFiles([])
    setFiles(newArr)
    setPayload({ ...payload, document: newArr })
  }

  function openFileExplorer() {
    inputRef.current.value = ''
    inputRef.current.click()
  }

  return {
    dragActive,
    inputRef,
    files,

    handleChange,
    handleSubmitFile,
    handleDrop,
    handleDragLeave,
    handleDragOver,
    handleDragEnter,
    removeFile,
    openFileExplorer,
  }
}

export const useDropzoneForCredentials = (
  credential: CredentialData,
  setCredential: (credential: CredentialData) => void
) => {
  const allowExtension = ['json']
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const { toast } = useToast()
  const [dragActive, setDragActive] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])

  function handleChange(e: any) {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `File exceeds maximum size of 5MB`,
          variant: 'destructive',
        });
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!allowExtension.includes(ext || '')) {
        toast({
          title: 'Invalid file type',
          description: 'Only JSON files are allowed',
          variant: 'destructive',
        });
        return;
      }

      // Replace existing file
      setFiles([file]);
      setCredential({
        ...credential,
        credentialFile: file
      });
    }
  }

  function handleSubmitFile() {
    if (files.length === 0) {
      // no file has been submitted
    } else {
      // write submit logic here
    }
  }

  function handleDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Validate file
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!allowExtension.includes(ext || '')) {
        toast({
          title: 'Invalid file type',
          description: 'Only JSON files are allowed',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `File exceeds maximum size of 5MB`,
          variant: 'destructive',
        });
        return;
      }

      // Replace existing file
      setFiles([file]);
      setCredential({
        ...credential,
        credentialFile: file
      });
    }
  }

  function handleDragLeave(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDragOver(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragEnter(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function removeFile(fileName: string, idx: number) {
    setFiles([]);
    setCredential({
      ...credential,
      credentialFile: ''
    });
  }


  function openFileExplorer() {
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.click()
    }
  }

  return {
    dragActive,
    inputRef,
    files,
    setFiles,
    handleChange,
    handleSubmitFile,
    handleDrop,
    handleDragLeave,
    handleDragOver,
    handleDragEnter,
    removeFile,
    openFileExplorer,
  }
}