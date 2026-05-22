import { Toaster as Sonner, ToasterProps } from "sonner";
import { useTheme } from "../ThemeProvider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { appearance } = useTheme();

  return (
    <Sonner
      theme={appearance}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
