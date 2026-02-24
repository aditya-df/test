import { unstable_cache } from "next/cache";
import { prisma } from "@/config/db";

export const getCachedAgentSystemInstructions = unstable_cache(
  async (agentId: string) => {
    if (!agentId) return { instructions: [] };

    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          agentName: true,
          description: true,
          systemInstruction: true,
          temperature: true,
          imageGenerationEnabled: true,
        },
      });

      if (!agent) return { instructions: [] };

      const instructions: string[] = [];

      instructions.push(
        "KEMAMPUAN PENTING: Anda dapat menganalisis file Excel yang di-upload oleh user. File Excel akan otomatis dikonversi ke format CSV dan disediakan dalam pesan sebagai teks yang dapat Anda baca dan analisis."
      );
      instructions.push(
        "Ketika user meng-upload file Excel dan meminta analisis, JANGAN pernah mengatakan tidak bisa mengakses file. Data sudah tersedia dalam format CSV di dalam pesan."
      );
      instructions.push(
        "Untuk file Excel: Cari bagian 'DATA CSV LENGKAP' dalam pesan dan analisis data tersebut untuk menjawab pertanyaan user."
      );

      if (agent.agentName) {
        instructions.push(`Your name is ${agent.agentName}.`);
        instructions.push(
          `Always identify yourself as ${agent.agentName}, never as Gemini or any AI model.`
        );
      }

      if (agent.description) {
        instructions.push(`You are ${agent.description}`);
      }

      if (agent.systemInstruction) {
        if (typeof agent.systemInstruction === "string") {
          instructions.push(agent.systemInstruction);
        } else if (Array.isArray(agent.systemInstruction)) {
          instructions.push(...(agent.systemInstruction as string[]));
        } else if (typeof agent.systemInstruction === "object") {
          const sysInst = agent.systemInstruction as { instructions?: string[] };
          if (sysInst.instructions && Array.isArray(sysInst.instructions)) {
            instructions.push(...sysInst.instructions);
          }
        }
      }

      return {
        instructions,
        temperature: agent.temperature || undefined,
        imageGenerationEnabled: agent.imageGenerationEnabled ?? true,
      };
    } catch (error) {
      console.error("Error fetching agent system instructions:", error);
      return { instructions: [] };
    }
  },
  ["agent-instructions"],
  { revalidate: 3600, tags: ["agent-instructions"] }
);
