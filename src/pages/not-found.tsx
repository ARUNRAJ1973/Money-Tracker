import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="text-muted-foreground text-sm">The page you are looking for does not exist.</p>
      <Link href="/">
        <a className="flex items-center gap-2 text-primary text-sm font-medium">
          <Home className="w-4 h-4" /> Go to Dashboard
        </a>
      </Link>
    </div>
  );
}
