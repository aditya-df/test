import { type FrequentlyAskedQuestion } from "@/types";

import { siteConfig } from "@/config/site";

export const frequentlyAskedQuestions: FrequentlyAskedQuestion[] = [
  {
    question: `What is ${siteConfig.name}?`,
    answer: `${siteConfig.name} is a platform for building AI-companions (AI assistants) according to the needs of business users such as HR, finance, legal, and others. ${siteConfig.name} is powered by Google's most advanced AI LLM model, Gemini.`,
  },
  {
    question: `What features are included in ${siteConfig.name}?`,
    answer: `- Embedded to Internal Portal, integrate applications or services directly into the internal portal used by employees or members of the organization/company.\n
- Serverless, does not require hardware investment to run the application, we can use it directly through a web browser.\n
- AI powered collective Knowledge, Maintain the sustainability of company information and knowledge with collective knowledge that is easily accessible to everyone in the company using the power of AI.\n
- AI Companion, create an AI assistant according to the needs of each team in the organization/company.
`,
  },
  {
    question: `Who can use ${siteConfig.name}?`,
    answer: `Any single organization / company can use our ${siteConfig.name} services`,
  },
  {
    question: `What are gemini models that are used by ${siteConfig.name}?`,
    answer: `Gemini is a family of large language models (LLMs) developed by Google DeepMind. Positioned as a successor to LaMDA and PaLM 2, it's designed to be more versatile and powerful.`,
  },
  {
    question: `What is the pricing scheme of ${siteConfig.name}?`,
    answer: `Our ${siteConfig.name} is offered using monthly subscription pricing. For any customization features needed please contact our sales representatives.`,
  },
  {
    question: `How do i get started?`,
    answer: `You can start using ${siteConfig.name} services by clicking the signup button and following all the steps needed to start the services.`,
  },
  {
    question: `Who can I contact to get any information regarding ${siteConfig.name}?`,
    answer: `Please contact google@metrodata.co.id for any support or further information needed.`,
  },
];
