import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Book, Video, FileText, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Docs() {
  const [, navigate] = useLocation();

  const documentationLinks = [
    {
      title: "User Guide",
      description: "Complete guide to using Bantah platform",
      icon: Book,
      action: () => window.open("/docs/user-guide", "_blank"),
    },
    {
      title: "API Documentation",
      description: "Technical documentation for developers",
      icon: FileText,
      action: () => window.open("/docs/api", "_blank"),
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      icon: Video,
      action: () => window.open("/docs/tutorials", "_blank"),
    },
    {
      title: "FAQ",
      description: "Frequently asked questions",
      icon: HelpCircle,
      action: () => navigate("/help-support"),
    },
  ];

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
              Documentation
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Everything you need to know about Bantah
            </p>
          </div>
        </div>

        {/* Documentation Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {documentationLinks.map((link, index) => (
            <Card
              key={index}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={link.action}
            >
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <link.icon className="w-5 h-5 text-primary mr-3" />
                  {link.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400">
                  {link.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Start Section */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-semibold mb-1">Sign Up</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Create your account with Telegram
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h4 className="font-semibold mb-1">Create Challenge</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Set up your prediction challenge
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h4 className="font-semibold mb-1">Earn Rewards</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Win points and climb the leaderboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}