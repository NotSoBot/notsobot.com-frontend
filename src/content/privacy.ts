import type { LegalDocument } from './legal';

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  effective: "March 15, 2022",
  lastUpdated: "March 15, 2022",
  intro: null,
  sections: [
    {
      title: "Overview",
      blocks: [
        {type: 'paragraph', text: "We follow all legal requirements to protect your privacy. Our Privacy Policy is a legal statement that explains how we may collect information from you, how we may share your information, and how you can limit our sharing of your information. You will see terms in our Privacy Policy that are capitalized. These terms have meanings as described in the Definitions section below."},
      ],
    },
    {
      title: "Section 1 - Definitions",
      blocks: [
        {type: 'paragraph', text: "\"Non Personal Information\" is information that is not personally identifiable to you and that we automatically collect when you access our Service with a web browser. It may also include publicly available information that is shared between you and others. \"Personally Identifiable Information\" is non-public information that is personally identifiable to you and obtained in order for us to provide you within our Service. Personally Identifiable Information may include information such as your discord username, discord descriminator, discord avatar, and other related information that you provide to us or that we obtain about you."},
      ],
    },
    {
      title: "Section 2 - Information We Collect",
      blocks: [
        {type: 'paragraph', text: "Generally, you control the amount and type of information you provide to us when using our Service. As a visitor, you can browse our website to find out more about our Service. You are not required to provide us with any Personally Identifiable Information as a visitor. As a user, you may be required to provide us with Personally Identifiable Information."},
      ],
    },
    {
      title: "Section 3 - How We Use Your Information",
      blocks: [
        {type: 'paragraph', text: "We use the information we receive from you as follows:"},
        {type: 'list', items: [
          "to customize our service to fit your needs",
          "to provide customer support",
          "to verify your identity and prevent fraudulent transactions",
          "to collect fees or other charges",
          "to contact you",
        ]},
      ],
    },
    {
      title: "Section 4 - Sharing Information With Affiliates and Other Third Parties",
      blocks: [
        {type: 'paragraph', text: "We do not sell, rent, or otherwise provide your Personally Identifiable Information to third parties for marketing purposes. We may provide your Personally Identifiable Information to affiliates that provide services to us with regards to our Service (i.e. payment processors, fraud prevention services, etc.); such affiliates will only receive information necessary to provide the respective services and will be bound by confidentiality agreements limiting the use of such information."},
      ],
    },
    {
      title: "Section 5 - Data Aggregation",
      blocks: [
        {type: 'paragraph', text: "We retain the right to collect and use any Non Personal Information collected from your use of our Service and aggregate such data for internal analytics that improve our Service and Service as well as for use or resale to others. At no time is your Personally Identifiable Information included in such data aggregations."},
      ],
    },
    {
      title: "Section 6 - Legally Required Releases of Information",
      blocks: [
        {type: 'paragraph', text: "We may be legally required to disclose your Personally Identifiable Information, if such disclosure is (a) required by subpoena, law, or other legal process; (b) necessary to assist law enforcement officials or government enforcement agencies; (c) necessary to investigate violations of or otherwise enforce our Legal Terms; (d) necessary to protect us from legal action or claims from third parties including you and/or other Members; and/or (e) necessary to protect the legal rights, personal/real property, or personal safety of NotSoBot developers, our users, employees, and affiliates."},
      ],
    },
    {
      title: "Section 7 - Links to Other Services",
      blocks: [
        {type: 'paragraph', text: "Our Service may contain links to other websites that are not under our direct control. These websites may have their own policies regarding privacy. We have no control of or responsibility for linked websites and provide these links solely for the convenience and information of our visitors. You access such linked Services at your own risk. These websites are not subject to this Privacy Policy. You should check the privacy policies, if any, of those individual websites to see how the operators of those third-party websites will utilize your personal information. In addition, these websites may contain a link to Services of our affiliates. The websites of our affiliates are not subject to this Privacy Policy, and you should check their individual privacy policies to see how the operators of such websites will utilize your personal information."},
      ],
    },
    {
      title: "Section 8 - Privacy Policy Updates",
      blocks: [
        {type: 'paragraph', text: "We reserve the right to modify this Privacy Policy at any time. You should review this Privacy Policy frequently. If we make material changes to this policy, we may notify you on our Service, by a blog post, by email, or by any method we determine. The method we choose is at our sole discretion."},
      ],
    },
    {
      title: "Section 9 - Contact Information",
      blocks: [
        {type: 'paragraph', text: "Questions about the Privacy Policy should be sent to us via email at privacy@notsocompany.com"},
      ],
    },
  ],
};
