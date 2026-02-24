"use client"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FileUpload } from "@/components/ui/file-uploader/file-upload"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Toast, ToastProvider } from "@/components/ui/toast"
import { useToolForm } from "@/hooks/knowledge-tool/use-tool-form"
import { useStore } from "@/stores/knowledge-new/useStore"
import { useStore as useAgentStore } from "@/stores/agent/useStore"
import { useStore as useParameterStore } from "@/stores/parameter/useStore"
import { Loader2, Minus, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export const UpdateToolComponent = () => {
    const params = useParams()
    const { toast } = useToast()
    const methods = ["GET", "POST", "PUT", "DELETE"]
    const [builtInTool] = useState([
        {
            value: "Wikipedia",
        },
        {
            value: "Weather",
        },
        {
            value: "Google Search",
        },
    ])
    const [selectedParameter, setSelectedParameter] = useState("")
    const { getList: getParameterList, data: parameters, loading: loadingParameter } = useParameterStore()
    const { getList: getAgentList, data: agents, loading: loadingAgent } = useAgentStore()
    const { create, update, getDetail, selectedData, loading: loadingDetail } = useStore()
    const {
        handleSelectChange,
        payload,
        setPayload,
        builtInKeyPayload,
        addBuiltInKey,
        handleBuiltInKeyInput,
        multipleFiles,
        setMultipleFiles,
        addHeaderRestAPI,
        handleHeaderRestAPIInput,
        removeHeaderRestAPI,
        headerRestAPI,
        handleSave,
        setPayloadRestAPI,
        payloadRestAPI,
        currentFiles,
        setCurrentFiles
    } = useToolForm(create, update, selectedData)

    useEffect(() => {
        const filters = { keyString: { value: "TOOL_KEY", command: "eq" } }
        getParameterList({
            offset: 1,
            limit: 50,
            filters: JSON.stringify(filters),
        })
        getAgentList({
            offset: 1,
            limit: 50,
        })
        if (params.id) {
            getDetail(params.id as string)
        }
        return () => { }
    }, [params.id])

    useEffect(() => {
        if (selectedData) {
            const parameter = parameters.find(
                (parameter) => parameter.id === selectedData.typeId
            )
            if (selectedData.type) {
                setSelectedParameter(selectedData.type.valueString)
            }
            setSelectedParameter(parameter?.valueString ? parameter.valueString : "")

            // Set initial payload values
            setPayload({
                type_id: selectedData.typeId,
                agent_id: selectedData.agentId,
                name: selectedData.name,
                system_instruction: selectedData.systemInstruction,
                function_name: selectedData.functionName || "",
                description: selectedData.description,
            })

            // Set current files for embedding tools
            if (selectedData.documents && selectedData.documents.length > 0) {
                setCurrentFiles(selectedData.documents.map(doc => doc.fileName))
            }

            if (parameter?.valueString === "BUILT-IN") {
                const nameBuiltIn = selectedData.name
                const parameters = selectedData.parameters
                const builtInParams = parameters["built-in"]?.environtments || []

                switch (nameBuiltIn) {
                    case "Wikipedia":
                        addBuiltInKey(["WIKIPEDIA_API_USER_AGENT"])
                        break
                    case "Weather":
                        addBuiltInKey(["WEATHER_API_KEY"])
                        break
                    case "Google Search":
                        addBuiltInKey(["GOOGLE_API_KEY", "GOOGLE_CSE_ID"])
                        break
                    default:
                        break
                }

                // Set the values from the existing data
                builtInKeyPayload.forEach((key, index) => {
                    if (builtInParams[index]) {
                        const [keyName, value] = Object.entries(builtInParams[index])[0]
                        console.log("keyName", keyName);
                        handleBuiltInKeyInput(key.id, String(value))
                    }
                })
            }

            if (parameter?.valueString === "REST API") {
                const parameters = JSON.parse(selectedData.parameters || "{}")
                const restApiParams = parameters["rest-api"] || {}

                setPayloadRestAPI({
                    method: restApiParams.method || "",
                    api_url: restApiParams.api_url || "",
                })

                // Set headers
                if (restApiParams.headers && Array.isArray(restApiParams.headers)) {
                    restApiParams.headers.forEach((header: any) => {
                        addHeaderRestAPI()
                        const lastHeader = headerRestAPI[headerRestAPI.length - 1]
                        if (lastHeader?.id) {
                            handleHeaderRestAPIInput(lastHeader.id, "key", header.key || "")
                            handleHeaderRestAPIInput(lastHeader.id, "value", header.value || "")
                            handleHeaderRestAPIInput(lastHeader.id, "is_secure", header.is_secure || false)
                        }
                    })
                }
            }
        }
        return () => {
            setSelectedParameter("")
        }
    }, [selectedData, parameters])

    useEffect(() => {
        console.log("selectedParameter", selectedParameter);
        console.log("payload.name", payload.name);
        if (selectedParameter === "BUILT-IN") {
            const nameBuiltIn = payload.name

            switch (nameBuiltIn) {
                case "Wikipedia":
                    addBuiltInKey(["WIKIPEDIA_API_USER_AGENT"])
                    break
                case "Weather":
                    addBuiltInKey(["WEATHER_API_KEY"])
                    break
                case "Google Search":
                    addBuiltInKey(["GOOGLE_API_KEY", "GOOGLE_CSE_ID"])
                    break
                default:
                    break
            }

            // Set the values from the existing data if available
            // builtInKeyPayload.forEach((key, index) => {
            //     if (builtInParams[index]) {
            //         const [keyName, value] = Object.entries(builtInParams[index])[0]
            //         handleBuiltInKeyInput(key.id, String(value))
            //     }
            // })
        }
    }, [payload.name, selectedParameter])

    const handleRemoveDocument = (fileName: string) => {
        toast({
            title: "Remove Document",
            description: "Are you sure you want to remove this document?",
            action: (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                        setCurrentFiles(prev => prev.filter(file => file !== fileName))
                        toast({
                            title: "Success",
                            description: "Document removed successfully",
                            variant: "default",
                        })
                    }}
                >
                    Remove
                </Button>
            ),
            variant: "destructive",
        })
    }

    if (loadingParameter || loadingAgent || loadingDetail) {
        return <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-10 h-10 animate-spin" />
        </div>
    }

    return (
        <ToastProvider>
            <Card className="w-full mt-6">
                <CardHeader>
                    <h1 className="text-2xl font-bold mb-4">Update Tool</h1>
                    <CardDescription>
                        Update your tool configuration
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold">Basic Configuration</h2>
                        <hr className="border-t border-gray-200" />
                        <div className="space-y-2">
                            <Label htmlFor="agent_id" className="block">
                                Agent <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                onValueChange={(value) => {
                                    handleSelectChange("agent_id", value)
                                }}
                                defaultValue={selectedData?.agentId}
                            >
                                <SelectTrigger className="w-full" name="agent_id">
                                    <SelectValue placeholder="Select tool type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>AI Agent</SelectLabel>
                                        {agents.map((agent) => (
                                            <SelectItem
                                                key={agent.id}
                                                value={agent.id ? agent.id : ""}
                                            >
                                                {agent.agentName}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type_id" className="block">
                                Type <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                onValueChange={(value) => {
                                    handleSelectChange("type_id", value)
                                }}
                                defaultValue={selectedData?.typeId}
                            >
                                <SelectTrigger className="w-full" name="type_id">
                                    <SelectValue placeholder="Select tool type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Tool Type</SelectLabel>
                                        {parameters.map((parameter) => (
                                            <SelectItem
                                                key={parameter.id}
                                                value={parameter.id ? parameter.id : ""}
                                            >
                                                {parameter.valueString}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            {selectedParameter !== "" && (
                                <Label htmlFor="description" className="block">
                                    Tool Name <span className="text-red-500">*</span>
                                </Label>
                            )}
                            {selectedParameter === "BUILT-IN" && (
                                <Select
                                    onValueChange={(value) => {
                                        handleSelectChange("name", value)
                                    }}
                                    defaultValue={selectedData?.name}
                                >
                                    <SelectTrigger className="w-full" name="name">
                                        <SelectValue placeholder="Select tool name" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Choose Tool</SelectLabel>
                                            {builtInTool.map((tool) => (
                                                <SelectItem
                                                    key={tool.value}
                                                    value={tool.value ? tool.value : ""}
                                                >
                                                    {tool.value}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            )}
                            {(selectedParameter === "EMBEDDING" ||
                                selectedParameter === "REST API") && (
                                    <Input
                                        type="text"
                                        placeholder="Tool Name"
                                        className="w-full"
                                        name="name"
                                        value={payload.name}
                                        onChange={(e) => {
                                            handleSelectChange("name", e.target.value)
                                        }}
                                        defaultValue={selectedData?.name}
                                    />
                                )}
                        </div>

                        <h2 className="text-lg font-bold mt-8">Advanced Configuration</h2>
                        <hr className="border-t border-gray-200" />
                        {selectedParameter === "BUILT-IN" && (
                            <div className="space-y-2">
                                {builtInKeyPayload.length > 0 && (
                                    <Label className="block">Insert Key</Label>
                                )}
                                {builtInKeyPayload.map((builtInInput) => (
                                    <div
                                        className="grid grid-cols-2 gap-4"
                                        key={builtInInput.id}
                                        id={builtInInput.id}
                                    >
                                        <Input
                                            type="text"
                                            placeholder="Key"
                                            className="w-full"
                                            name="key"
                                            disabled
                                            value={builtInInput.key}
                                        />
                                        <Input
                                            type="text"
                                            placeholder="Value"
                                            className="w-full"
                                            name="value"
                                            value={builtInInput.value}
                                            onChange={(e) => {
                                                handleBuiltInKeyInput(
                                                    builtInInput.id,
                                                    e.target.value
                                                )
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedParameter === "EMBEDDING" && (
                            <>

                                <div className="space-y-2">
                                    <Label className="block" htmlFor="embedding_file">
                                        Input Documents
                                    </Label>
                                    <FileUpload
                                        files={multipleFiles}
                                        onFilesChange={setMultipleFiles}
                                        maxSize={1024 * 1024 * 10}

                                        accept="application/pdf"
                                        multiple={true}
                                    />
                                </div>
                                {currentFiles.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <Label className="block">Current Documents</Label>
                                        <div className="space-y-2">
                                            {currentFiles.map((fileName) => (
                                                <div key={fileName} className="flex items-center justify-between p-2 border rounded">
                                                    <span>{fileName}</span>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleRemoveDocument(fileName)}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        {selectedParameter === "REST API" && (
                            <>
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="space-y-2 col-span-3">
                                        <Label className="block" htmlFor="method">
                                            Method
                                        </Label>
                                        <Select
                                            onValueChange={(value) => {
                                                setPayloadRestAPI(prev => ({ ...prev, method: value }))
                                            }}
                                            defaultValue={payloadRestAPI?.method}
                                        >
                                            <SelectTrigger className="w-full" name="method">
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Method</SelectLabel>
                                                    {methods.map((method) => (
                                                        <SelectItem
                                                            key={method}
                                                            value={method ? method : ""}
                                                        >
                                                            {method}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-9">
                                        <Label className="block" htmlFor="endpoint">
                                            API URL
                                        </Label>
                                        <Input
                                            type="text"
                                            placeholder="URL"
                                            className="w-full"
                                            name="endpoint"
                                            value={payloadRestAPI?.api_url}
                                            onChange={(e) => {
                                                setPayloadRestAPI(prev => ({ ...prev, api_url: e.target.value }))
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="block" htmlFor="headers">
                                        Headers
                                    </Label>
                                    {headerRestAPI.map((header) => (
                                        <div
                                            className="grid grid-cols-2 gap-2"
                                            key={header.id}
                                            id={header.id}
                                        >
                                            <Input
                                                type="text"
                                                placeholder="Key"
                                                className="w-full"
                                                name="headersKey"
                                                value={header.key}
                                                onChange={(e) => {
                                                    handleHeaderRestAPIInput(
                                                        header.id ? header.id : "",
                                                        "key",
                                                        e.target.value
                                                    )
                                                }}
                                            />
                                            <div className="space-y-1">
                                                <Input
                                                    type="text"
                                                    placeholder="Value"
                                                    className="w-full"
                                                    name="headersValue"
                                                    value={header.value}
                                                    onChange={(e) => {
                                                        handleHeaderRestAPIInput(
                                                            header.id ? header.id : "",
                                                            "value",
                                                            e.target.value
                                                        )
                                                    }}
                                                />
                                                <div className="flex gap-1 mt-1">
                                                    <Checkbox
                                                        checked={header.is_secure}
                                                        onCheckedChange={(e) => {
                                                            handleHeaderRestAPIInput(
                                                                header.id ? header.id : "",
                                                                "is_secure",
                                                                e
                                                            )
                                                        }}
                                                    />
                                                    <Label className="block">Is Secure</Label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            addHeaderRestAPI()
                                        }}
                                    >
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                    {headerRestAPI.length > 0 && (
                                        <Button
                                            className="ml-2"
                                            variant="destructive"
                                            onClick={() => {
                                                removeHeaderRestAPI(
                                                    headerRestAPI[headerRestAPI.length - 1].id || ""
                                                )
                                            }}
                                        >
                                            <Minus className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                        {/* {(selectedParameter === "EMBEDDING" ||
                            selectedParameter === "REST API") && (
                                <div className="space-y-2">
                                    <Label className="block" htmlFor="description">
                                        Function Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="Function Name"
                                        name="function_name"
                                        onChange={handleInputChange}
                                        defaultValue={selectedData?.functionName}
                                    />
                                </div>
                            )} */}
                        {/* <div className="space-y-2">
                            <Label className="block" htmlFor="systemInstruction">
                                System Instruction <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="systemInstruction"
                                placeholder="This is your system instruction to describe your knowledge, please fill it at least with 10 words"
                                className="h-40"
                                name="system_instruction"
                                onChange={handleInputChange}
                                defaultValue={selectedData?.systemInstruction}
                            />
                        </div> */}
                        {/* <div className="space-y-2">
                            <Label className="block" htmlFor="description">
                                Description <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Description"
                                className="h-40"
                                name="description"
                                onChange={handleInputChange}
                                defaultValue={selectedData?.description}
                            />
                        </div> */}
                    </div>
                    <Button
                        className="mt-4"
                        onClick={() => {
                            // Add current files to payload before saving
                            if (selectedParameter === "EMBEDDING") {
                                setPayload(prev => ({
                                    ...prev,
                                    current_files: currentFiles
                                }))
                            }
                            handleSave()
                        }}
                    >
                        Update
                    </Button>
                </CardContent>
                <Toast />
            </Card>
        </ToastProvider>
    )
}
