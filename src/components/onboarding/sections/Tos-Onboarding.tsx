'use client'

import React, { useEffect, useState, useRef } from 'react'
import SectionHeader from '../SectionHeader'
import { cn } from '@/utils/utils'
import Container from '../Container'
import { Checkbox } from '@/components/ui/checkbox'
import useStore from '@/stores/onboarding/useStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import dynamic from 'next/dynamic'
const DynamicThankYou = dynamic(() => import('./ThankYou'), { ssr: false })

export default function TOSOnboarding() {
  const {
    acceptedTerms,
    setAcceptedTerms,
    setNextButtonDisabled,
    decreaseStep,
    step,
    onSubmit,
    isSubmitted,
  } = useStore((state) => state)
  const textAreaContainerRef = useRef<HTMLDivElement>(null)
  const textAreaEndRef = useRef<HTMLDivElement>(null)

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)


  const onNext = () => {
    if (acceptedTerms) {
      // increaseStep(step);
      onSubmit(isSubmitted)
    }
  }

  const onPrevious = () => {
    decreaseStep(step)
  }

  useEffect(() => {
    setNextButtonDisabled(!acceptedTerms)
  }, [acceptedTerms, setNextButtonDisabled])

  useEffect(() => {
    const textAreaContainer = textAreaContainerRef.current
    if (textAreaContainer) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = textAreaContainer
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px threshold
        setIsScrolledToBottom(isAtBottom)
      }

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        textAreaContainer.scrollTop += e.deltaY
        handleScroll()
      }

      textAreaContainer.addEventListener('wheel', handleWheel, { passive: false })
      textAreaContainer.addEventListener('scroll', handleScroll, { passive: true })

      return () => {
        textAreaContainer.removeEventListener('wheel', handleWheel)
        textAreaContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    const textAreaContainer = textAreaContainerRef.current
    if (textAreaContainer) {
      let startY: number

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0]?.clientY ?? 0
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          const deltaY = startY - e.touches[0].clientY
          textAreaContainer.scrollTop += deltaY
          startY = e.touches[0].clientY

          const { scrollTop, scrollHeight, clientHeight } = textAreaContainer
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px threshold
          setIsScrolledToBottom(isAtBottom)
        }
      }

      textAreaContainer.addEventListener('touchstart', handleTouchStart)
      textAreaContainer.addEventListener('touchmove', handleTouchMove)

      return () => {
        textAreaContainer.removeEventListener('touchstart', handleTouchStart)
        textAreaContainer.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [])

  return (
    <Container onNext={onNext} onPreviousStep={onPrevious}>
      {isSubmitted ? (
        <DynamicThankYou />
      ) : (
        <div className="flex flex-col h-full">
          <SectionHeader
            title="Terms of Service"
            description="Please review and accept our Terms of Service to continue."
            // className="mb-4"
          />
          <Card className="flex flex-col grow">
            <CardHeader>
              <CardTitle>KnowGen Terms of Service</CardTitle>
              <CardDescription>Effective 22 August, 2024</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col grow">
              <div
                ref={textAreaContainerRef}
                className="grow h-[22vh] overflow-y-auto pr-4 -mr-4"
                // style={{ scrollBehavior: 'smooth' }}
              >
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold">KnowGen Terms of Service</h2>
                    <p className="mt-4 text-muted-foreground">Effective 18 November 2024</p>
                    <p className="mt-4 text-muted-foreground">
                      Thank you for using KnowGen. By accessing or using our Products, You are
                      agreeing to the terms below. If there is a conflict between these terms and
                      additional terms applicable to a given Products, the additional terms will
                      control for that conflict. Collectively, We refer to the terms below, any
                      additional terms, terms within the accompanying KnowGen documentation, and any
                      applicable policies and guidelines as the &quot;Terms.&quot; You agree to comply with
                      the Terms and that the Terms control your relationship with Us. So please read
                      all the Terms carefully. If you use the KnowGen as an interface to, or in
                      conjunction with other products or services, then the terms for those other
                      products or services also apply.
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      Under the Terms, &quot;ME&quot; means PT. Metrodata Electronics, with offices at APL
                      Tower 37th floor , Jl. Letjen S.Parman Kav.28 Jakarta 11470. We may refer to
                      &quot;ME&quot; as &quot;we&quot;, &quot;our&quot;, or &quot;us&quot; in the Terms.
                    </p>
                    <p className="mt-4 text-muted-foreground">“Product” means KnowGen.</p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 1: Account and Registration</h3>
                    <h2 className="text-1xl font-bold mt-4">A. Accepting the Terms</h2>
                    <p className="mt-4 text-muted-foreground">
                      You may not use the product and may not accept the Terms if (a) you are not of
                      legal age to form a binding contract with ME, or (b) you are a person barred
                      from using or receiving the product under the applicable laws of the Indonesia
                      or other countries including the country in which you are resident or from
                      which you use the Product.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. Entity Level Acceptance</h2>
                    <p className="mt-4 text-muted-foreground">
                      If you are using the Product on behalf of an entity, You represent and warrant
                      that You have authority to bind that entity to the Terms and by accepting the
                      Terms, you are doing so on behalf of that entity (and all references to &quot;you&quot;
                      in the Terms refer to that entity).
                    </p>
                    <h2 className="text-1xl font-bold mt-4">C. Registration</h2>
                    <p className="mt-4 text-muted-foreground">
                      In order to access KnowGen you may be required to provide certain information
                      (such as identification or contact details) as part of the registration
                      process for the Product, or as part of your continued use of the Product. Any
                      registration information you give to ME will always be accurate and up to date
                      and you&apos;ll inform us promptly of any updates. You are responsible for
                      safeguarding your account credentials and for all activities that occur under
                      your account.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 2: Using Our Product</h3>
                    <h2 className="text-1xl font-bold mt-4">
                      A. Compliance with Law, Third Party Rights, and Other Google Terms of Service
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                      You will be required to comply with all applicable law, regulation, and third
                      party rights (including without limitation laws regarding the import or export
                      of data or software, privacy, and local laws). You will not use the Product to
                      encourage or promote illegal activity or violation of third party rights. You
                      will not violate any other terms of service with Google (or its affiliates).
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. Permitted Access</h2>
                    <p className="mt-4 text-muted-foreground">
                      The App is intended for internal use by You. You are not allowed to use the
                      App for any illegal, unauthorized, or unethical activities.You will not
                      misrepresent or mask your identity when using the Product.
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      The app is not shared with anyone else or will be used by fewer than 100
                      users.
                    </p>

                    <h2 className="text-1xl font-bold mt-4">C. Monitoring</h2>
                    <p className="mt-4 text-muted-foreground">
                      You agree that ME may monitor use of the Product to ensure quality, improve
                      Knowgen product and services and verify your compliance with the terms. This
                      monitoring may include ME accessing and using your data, for example to
                      identify security issues that could affect its users. You will not interfere
                      with this monitoring. ME may use any technical means to overcome such
                      interference. ME may suspend access to the Product by you without notice if We
                      reasonably believe that you are in violation of the Terms.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">D. Data Ownership</h2>
                    <p className="mt-4 text-muted-foreground">
                      ME does not acquire ownership in your data, and by using our Product, you do
                      not acquire ownership of any rights in our Product or the content that is
                      accessed through our Product. Some of our Services allow you to generate
                      original content. ME won&apos;t claim ownership over that content. You&apos;re
                      responsible for Your use of generated content, and for the use of that content
                      by anyone you share it with.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">E. Data Collection</h2>
                    <p className="mt-4 text-muted-foreground">
                      When you&apos;re using the Product, ME doesn&apos;t collect, use, and process data or
                      responses to improve our Products, and will process Your data in accordance
                      with applicable data regulations law.
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      We collect , use, and process data such as account information and settings,
                      billing history, direct communications and feedback, and usage details (e.g.,
                      information about usage including token count per prompt and response,
                      operational status, safety filter triggers, software errors and crash reports,
                      authentication details, quality and performance metrics, and other technical
                      details necessary for ME to operate and maintain Services.
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      ME only uses content that you import or upload to your model tuning feature
                      for that express purpose. Tuning content may be retained in connection with
                      your tuned models for purposes of re-tuning when supported models change. When
                      you delete a tuned model, the related tuning content is also deleted.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">F. Data Security</h2>
                    <p className="mt-4 text-muted-foreground">
                      We implement reasonable security measures to protect Your data. ME will use
                      reasonable efforts to protect user information collected by KnowGen, from
                      unauthorized access or use and will promptly report to You any unauthorized
                      access or use of such information to the extent required by applicable law and
                      We cannot guarantee absolute security.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">G. Communication</h2>
                    <p className="mt-4 text-muted-foreground">
                      We may send You certain communications in connection with Your use of the
                      Product.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">H. Feedback</h2>
                    <p className="mt-4 text-muted-foreground">
                      If you provide feedback or suggestions about our Product, then we (and those
                      we allow) may use such information for improvement of the product without
                      obligation to you.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">I. Non-Exclusivity</h2>
                    <p className="mt-4 text-muted-foreground">
                      The Terms are non-exclusive. You acknowledge that ME may develop products or
                      services that may compete with any other products or services.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">J. Google Drive API Connection</h2>
                    <p className="mt-4 text-muted-foreground">
                      Google drive API connection with Knowgen used limited for as datastore for the
                      agent built in the application, there are no transfers or connection with
                      another third party AI tools is used within the apps.
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      Google Workspace APIs are not used to develop, improve, or train
                      generalized/non-personalized AI and/or ML models.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 3: Subscriptions and Payment</h3>
                    <h2 className="text-1xl font-bold mt-4">A. Subscription Fees</h2>
                    <p className="mt-4 text-muted-foreground">
                      Access to certain features of the App may require a paid subscription.
                      Subscription fees are detailed on the App&apos;s pricing page and are subject to
                      change.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. Payment Terms</h2>
                    <p className="mt-4 text-muted-foreground">
                      Subscription fees are billed in advance and are non-refundable. ME agrees to
                      provide accurate billing information and to promptly update any changes to
                      billing information.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">C. Cancellation</h2>
                    <p className="mt-4 text-muted-foreground">
                      ME may cancel its subscription (caused by violation of KnowGen terms of
                      service) at any time. Cancellation will take effect at the end of the current
                      billing cycle, and you will not be entitled to a refund for any unused portion
                      of the subscription.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      Section 4: Prohibitions and Confidentiality
                    </h3>
                    <h2 className="text-1xl font-bold mt-4">A. Prohibitions</h2>
                    <p className="mt-4 text-muted-foreground">
                      When using the Product, you may not (or allow those acting on your behalf to):
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          Sublicense an API for use by a third party. Consequently, you will not
                          create an API Client that functions substantially the same as the Product
                          and offer it for use by third parties.
                        </li>
                        <li>
                          Perform an action with the intent of introducing to Knowgen and services
                          any viruses, worms, defects, Trojan horses, malware, or any items of a
                          destructive nature.
                        </li>
                        <li>Defame, abuse, harass, stalk, or threaten others.</li>
                        <li>
                          Interfere with or disrupt the Product or the servers or networks providing
                          the Product.
                        </li>
                        <li>
                          Promote or facilitate unlawful online gambling or disruptive commercial
                          messages or advertisements.
                        </li>
                        <li>
                          Reverse engineer or attempt to extract the source code from any API or any
                          related software.
                        </li>
                        <li>
                          Use the Product for any activities where the use or failure of the Product
                          could lead to death, personal injury, or environmental damage (such as the
                          operation of nuclear facilities, air traffic control, or life support
                          systems).
                        </li>
                        <li>
                          Remove, obscure, or alter any ME terms of service or any links to or
                          notices of those terms.
                        </li>
                      </ul>
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. Confidential Matters</h2>
                    <p className="mt-4 text-muted-foreground">
                      Our communications to You and our Product may contain ME confidential
                      information. ME confidential information includes any materials,
                      communications, and information that are marked confidential or that would
                      normally be considered confidential under the circumstances. If you receive
                      any such information, then You will not disclose it to any third party without
                      ME&apos;s prior written consent. ME confidential information does not include
                      information that you independently developed, that was rightfully given to you
                      by a third party without confidentiality obligation, or that becomes public
                      through no fault of Your own.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 5: Content</h3>

                    <h2 className="text-1xl font-bold mt-4">
                      A. Content Accessible Through our Product
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                      Our Product contains some third party content (such as text, images, videos,
                      audio, or software). This content is the sole responsibility of the person
                      that makes it available. Finally, content accessible through our Product may
                      be subject to intellectual property rights, and, if so, you may not use it
                      unless you are licensed to do so by the owner of that content or are otherwise
                      permitted by law.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. Submission of Content</h2>
                    <p className="mt-4 text-muted-foreground">
                      Our Product allows the submission of content from your data. ME does not
                      acquire any ownership of any intellectual property rights in the content that
                      you submit to our Product.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">C. Prohibitions on Content</h2>
                    <p className="mt-4 text-muted-foreground">
                      Unless expressly permitted by the content owner or by applicable law, You will
                      not, and will not permit your end users or others acting on your behalf to, do
                      the following with content returned from the Product:
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          Scrape, build databases, or otherwise create permanent copies of such
                          content, or keep cached copies longer than permitted by the cache header;
                        </li>
                        <li>
                          Copy, translate, modify, create a derivative work of, sell, lease, lend,
                          convey, distribute, publicly display, or sublicense to any third party;
                        </li>
                        <li>Misrepresent the source or ownership; or</li>
                        <li>
                          Remove, obscure, or alter any copyright, trademark, or other proprietary
                          rights notices; or falsify or delete any author attributions, legal
                          notices, or other labels of the origin or source of material.
                        </li>
                      </ul>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      Section 6: Brand Features and Copyright Protection
                    </h3>
                    <p className="mt-4 text-muted-foreground">
                      &quot;Brand Features&quot; is defined as the trade names, trademarks, service marks,
                      logos, domain names, and other distinctive brand features of each party.
                      Except where expressly stated, the Terms do not grant either party any right,
                      title, or interest in or to the other party&apos;s Brand Features. The Product and
                      each of their components are owned by ME and other licensors and are protected
                      under copyright law and under other laws as applicable. Title to the Product
                      and any component, or to any copy, modification, or merged portion shall
                      remain with ME and other licensors, subject to the applicable Product.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 7: Termination</h3>
                    <p className="mt-4 text-muted-foreground">
                      You may stop using our Product at any time with. Further, if you want to
                      terminate the Terms, you must provide ME with prior written notice and upon
                      termination, cease your use of the applicable Product. ME reserves the right
                      to terminate the Terms with You or discontinue the Product or any portion or
                      feature or your access thereto for any reason and at any time without
                      liability or other obligation to you.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 8: Liability for our Product</h3>
                    <h2 className="text-1xl font-bold mt-4">A. Warranties</h2>
                    <p className="mt-4 text-muted-foreground">
                      Except as expressly set out in the terms, neither ME nor its suppliers or
                      distributors make any specific promises about the product. for example, we
                      don&apos;t make any commitments about the content accessed through the product, the
                      specific functions of the product, or their reliability, availability, or
                      ability to meet your needs. we provide the product &quot;as is&quot;.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. Limitation of Liability</h2>
                    <p className="mt-4 text-muted-foreground">
                      ME will not be responsible for lost profits, revenues, or data; financial
                      losses; or indirect, special, consequential, exemplary, or punitive damages.
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      in all cases, ME will not be liable for any expense, loss, or damage that is
                      not reasonably foreseeable.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Section 9: General Provisions</h3>
                    <h2 className="text-1xl font-bold mt-4">A. Modification</h2>
                    <p className="mt-4 text-muted-foreground">
                      We may modify the Terms or any portion to, for example, reflect changes to the
                      law or changes to our Product. You should look at the Terms regularly. We&apos;ll
                      post notices of modifications to the Terms through email and/or in the Knowgen
                      console. Changes will not apply retroactively and will become effective no
                      sooner than 30 days after they are posted. But changes addressing new
                      functions or changes made for legal reasons will be effective immediately. If
                      you do not agree to the modified Terms, you should discontinue your use. Your
                      continued use of the product constitutes your acceptance of the modified
                      Terms.
                    </p>
                    <h2 className="text-1xl font-bold mt-4">B. General</h2>
                    <p className="mt-4 text-muted-foreground">
                      If any provision of this KnowGen Terms of Services is held to be
                      unenforceable, the enforceability of the remaining provisions shall not be
                      affected. Any claim, controversy or dispute arising under or relating to this
                      Terms of Service shall be governed by the laws of the Indonesian Law, without
                      regard to any conflict of laws provisions.
                    </p>
                  </div>
                </div>
                <div ref={textAreaEndRef} />
              </div>
              <div className="flex mt-4 items-center space-x-2">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  disabled={!isScrolledToBottom}
                />
                <label
                  htmlFor="accept-terms"
                  className={cn(
                    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                    !isScrolledToBottom && 'opacity-90',
                  )}
                >
                  I have read and agree to the Terms of Service
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Container>
  )
}
