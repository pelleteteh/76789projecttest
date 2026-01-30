import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Search,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  popularity: number;
}

export default function FAQ() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const faqs: FAQItem[] = [
    {
      id: "1",
      question: "How do I deposit money into my account?",
      answer:
        "You can deposit money by going to the Wallet page and clicking 'Deposit'. We support bank transfers, cards, and mobile money payments through Paystack.",
      category: "payments",
      popularity: 95,
    },
    {
      id: "2",
      question: "How long do withdrawals take?",
      answer:
        "Withdrawals typically take 1-3 business days to process. The exact time depends on your payment method and bank processing times.",
      category: "payments",
      popularity: 90,
    },
    {
      id: "3",
      question: "What are coins and how do I earn them?",
      answer:
        "Coins are our virtual currency used for challenges and games. You can earn coins by winning challenges, daily sign-ins, referrals, and special promotions.",
      category: "coins",
      popularity: 85,
    },
    {
      id: "4",
      question: "What types of challenges can I participate in?",
      answer:
        "Bantah offers two types of challenges: 1) Head-to-Head Challenges - Create a challenge and invite a specific friend to compete against you. 2) Featured Challenges - Participate in platform-featured challenges where you can compete with other users. Both types allow you to stake coins or money and win rewards.",
      category: "challenges",
      popularity: 85,
    },
    {
      id: "5",
      question: "How do I create a challenge?",
      answer:
        "Go to the Challenges page and click 'Create Challenge'. You can create a head-to-head challenge with a friend by selecting them from your friends list, setting the challenge details (title, description, stakes), and sending the invitation. They'll receive a notification to accept or decline.",
      category: "challenges",
      popularity: 75,
    },
    {
      id: "6",
      question: "How do I verify my account?",
      answer:
        "Account verification is automatic for most users. If additional verification is needed, we'll send you an email with instructions. You can also contact support for help.",
      category: "account",
      popularity: 70,
    },
    {
      id: "7",
      question: "Can I cancel a challenge?",
      answer:
        "Challenges can only be cancelled before they start or if the other party hasn't accepted yet. Once active and both parties have accepted, they cannot be cancelled. Contact support if you have exceptional circumstances.",
      category: "challenges",
      popularity: 65,
    },
    {
      id: "8",
      question: "How do I add friends?",
      answer:
        "You can add friends by searching for their username in the Friends page, or by sharing your referral code. You can also import contacts if they're already on Bantah.",
      category: "social",
      popularity: 60,
    },
    {
      id: "9",
      question: "How do I change my profile picture?",
      answer:
        "Go to your Profile page and click on your current avatar. You can upload a new image from your device or choose from our avatar collection.",
      category: "account",
      popularity: 55,
    },
    {
      id: "10",
      question: "What happens if I lose a challenge?",
      answer:
        "If you lose a challenge, the staked amount goes to the winner. You can always create new challenges to win back your coins or money. Remember, it's all about having fun!",
      category: "challenges",
      popularity: 50,
    },
    {
      id: "11",
      question: "How do I reset my password?",
      answer:
        "If you've forgotten your password, click 'Forgot Password' on the login page. We'll send you an email with instructions to reset it.",
      category: "account",
      popularity: 45,
    },
    {
      id: "12",
      question: "Can I play without real money?",
      answer:
        "Yes! You can participate in challenges using only coins, which you can earn through daily bonuses, referrals, and winning free challenges.",
      category: "coins",
      popularity: 40,
    },
  ];

  const categories = [
    { id: "all", name: "All Categories", count: faqs.length },
    {
      id: "payments",
      name: "Payments & Wallet",
      count: faqs.filter((f) => f.category === "payments").length,
    },
    {
      id: "challenges",
      name: "Challenges",
      count: faqs.filter((f) => f.category === "challenges").length,
    },
    {
      id: "coins",
      name: "Coins & Rewards",
      count: faqs.filter((f) => f.category === "coins").length,
    },
    {
      id: "account",
      name: "Account & Profile",
      count: faqs.filter((f) => f.category === "account").length,
    },
    {
      id: "social",
      name: "Social Features",
      count: faqs.filter((f) => f.category === "social").length,
    },
  ];

  const filteredFAQs = faqs
    .filter(
      (faq) => selectedCategory === "all" || faq.category === selectedCategory,
    )
    .filter(
      (faq) =>
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => b.popularity - a.popularity);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 theme-transition pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              Frequently Asked Questions
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Find answers to common questions about Bantah
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help topics..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? "bg-primary text-white shadow-lg"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>

        {/* FAQ Content */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-primary" />
              {filteredFAQs.length} questions found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{faq.question}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categories.find((c) => c.id === faq.category)?.name}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 dark:text-slate-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Still Need Help Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800 mt-8">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Still need help?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Can't find what you're looking for? Our support team is here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/help-support")}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "mailto:support@bantah.com")}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email Us
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}