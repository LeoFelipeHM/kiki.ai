import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calendar, Home, MessageCircle, Settings } from "lucide-react";
import { ScreenTransition } from "@/components/motion/ScreenTransition";
import { AnimatedIcon } from "@/components/motion/AnimatedIcon";
import { CalendarScreen } from "./components/CalendarScreen";
import { ChatScreen } from "./components/ChatScreen";
import { HomeScreen } from "./components/HomeScreen";
import { SettingsScreen } from "./components/SettingsScreen";

type Tab = 'home' | 'chat' | 'calendar' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const reduceMotion = useReducedMotion();

  const tabs = useMemo(
    () => [
      { id: "home" as Tab, icon: Home, label: "Início" },
      { id: "chat" as Tab, icon: MessageCircle, label: "Chat" },
      { id: "calendar" as Tab, icon: Calendar, label: "Calendário" },
      { id: "settings" as Tab, icon: Settings, label: "Config" },
    ],
    [],
  );

  const screen = useMemo(() => {
    switch (activeTab) {
      case "home":
        return <HomeScreen onNavigateToChat={() => setActiveTab("chat")} />;
      case "chat":
        return <ChatScreen />;
      case "calendar":
        return <CalendarScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <HomeScreen onNavigateToChat={() => setActiveTab("chat")} />;
    }
  }, [activeTab]);

  return (
    <div className="size-full flex flex-col bg-background max-w-md mx-auto">
      <AnimatePresence mode="wait" initial={false}>
        <ScreenTransition motionKey={activeTab} className="flex min-h-0 flex-1">
          {screen}
        </ScreenTransition>
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/90 backdrop-blur border-t border-border">
        <div className="relative flex items-center justify-around px-4 py-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="group relative flex flex-col items-center gap-1 min-w-[72px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:rounded-2xl"
              >
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 520, damping: 42 }
                      }
                    />
                  )}
                  <motion.div
                    className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground transition-[background-color,color,transform] duration-200 ${
                      isActive
                        ? "text-white"
                        : "group-hover:bg-muted group-active:scale-[0.98]"
                    }`}
                    whileHover={reduceMotion ? undefined : { y: -1 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98, y: 0 }}
                    transition={
                      reduceMotion ? { duration: 0 } : { duration: 0.18 }
                    }
                  >
                    <AnimatedIcon
                      className="inline-flex"
                      hover={isActive ? "none" : "lift"}
                    >
                      <tab.icon className="w-6 h-6 transition-[transform,opacity] duration-200 group-hover:opacity-90" />
                    </AnimatedIcon>
                  </motion.div>
                </div>
                <span
                  className={`text-xs transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground/80"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
