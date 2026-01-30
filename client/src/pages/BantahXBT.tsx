import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, MessageSquare, TrendingUp, Users, Zap, Twitter, Hash, ExternalLink, Sparkles, Heart, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function BantahXBT() {
  const [, navigate] = useLocation();

  const socialLinks = [
    {
      name: "Twitter",
      icon: Twitter,
      url: "https://twitter.com/bantahxbt",
      color: "hover:text-blue-500",
      bgColor: "hover:bg-blue-50 dark:hover:bg-blue-950/20",
      description: "Follow for real-time updates & trending predictions!"
    },
    {
      name: "Farcaster",
      icon: ExternalLink,
      url: "https://warpcast.com/bantahxbt",
      color: "hover:text-purple-500",
      bgColor: "hover:bg-purple-50 dark:hover:bg-purple-950/20",
      description: "Join the Web3 conversation on Farcaster!"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 theme-transition pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="mr-4 hover:bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
                BantahXBT
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Your Super Fun AI Buddy for Bantah! 🤖✨
              </p>
            </div>
          </div>

          {/* Mascot */}
          <div className="hidden md:block">
            <img
              src="/assets/bantzzlogo.svg"
              alt="BantahXBT Mascot"
              className="w-24 h-24 animate-bounce hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-max">
          {/* Hero Section - Full Width */}
          <div className="md:col-span-3 bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-center">
              <div className="md:hidden mb-6">
                <img
                  src="/assets/bantzzlogo.svg"
                  alt="BantahXBT Mascot"
                  className="w-20 h-20 mx-auto animate-bounce"
                />
              </div>
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Meet Your New Best Friend! 🎉
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                I'm BantahXBT, your hilarious AI companion! I suggest epic challenges, chat with awesome people, and keep you in the loop with all the trending buzz on social media! 🚀
              </p>
              <div className="mt-4 flex justify-center gap-4 text-2xl">
                <span className="animate-bounce">🤖</span>
                <span className="animate-pulse">💜</span>
                <span className="animate-bounce">🎯</span>
                <span className="animate-pulse">🔥</span>
                <span className="animate-bounce">⭐</span>
              </div>
            </div>
          </div>

          {/* Social Links - 2 items */}
          {socialLinks.map((social, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => window.open(social.url, '_blank')}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-full bg-slate-100 dark:bg-slate-700 ${social.color} transition-colors flex-shrink-0`}>
                  <social.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {social.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {social.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {social.name === "Twitter" && (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      #BantahXBT
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      #AIBuddy
                    </span>
                  </>
                )}
                {social.name === "Farcaster" && (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      #Web3AI
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      #BantahFun
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Features - 3 items */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-6 h-6 text-blue-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Chat Champion 🗣️</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              I reply to comments, start fun conversations, and keep the Bantah community buzzing with excitement!
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-green-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Friend Maker 👥</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Making connections is my superpower! I help you find awesome people and build epic friendships.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-purple-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Trend Hunter 📈</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              I sniff out the hottest trends on Twitter and Farcaster so you never miss the fun!
            </p>
          </div>

          {/* Capabilities - Full Width */}
          <div className="md:col-span-3 bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-6">
              My Super Fun Powers! ⚡
            </h3>
            <div className="grid md:grid-cols-2 gap-8 mb-6">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">🎯 Smart Suggestions</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 flex-shrink-0">✓</span>
                    <span>Personalized challenge picks just for you!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 flex-shrink-0">✓</span>
                    <span>Betting tips that actually make sense!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 flex-shrink-0">✓</span>
                    <span>Fun predictions that might come true! 🎲</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">🚀 Community Magic</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 flex-shrink-0">💬</span>
                    <span>Witty replies that make people smile!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 flex-shrink-0">📣</span>
                    <span>Viral posts that everyone loves!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 flex-shrink-0">🎉</span>
                    <span>Keeping the party going 24/7!</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="text-center pt-6 border-t border-slate-300 dark:border-slate-700">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Ready to have some fun? Let's get started! 🎊
              </p>
              <div className="flex justify-center gap-4 flex-wrap">
                <Button
                  onClick={() => navigate("/challenges")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                >
                  🎯 Start Challenging!
                </Button>
                <Button
                  onClick={() => navigate("/friends")}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                >
                  👥 Make Friends!
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}