import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Building2, 
  Users, 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe,
  CheckCircle,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: TrendingUp,
      title: "Sales Management",
      description: "Complete lead-to-cash pipeline with automated workflows"
    },
    {
      icon: Users,
      title: "Human Resources",
      description: "Employee management, payroll, and performance tracking"
    },
    {
      icon: Building2,
      title: "Multi-Branch Operations",
      description: "Centralized control with branch-specific access and reporting"
    },
    {
      icon: Shield,
      title: "Role-Based Security",
      description: "Granular permissions and data security across all modules"
    },
    {
      icon: Zap,
      title: "Real-Time Analytics",
      description: "Live dashboards and business intelligence insights"
    },
    {
      icon: Globe,
      title: "GST & Compliance",
      description: "Automated GST calculations and e-invoice generation"
    }
  ];

  const modules = [
    "Sales Dashboard",
    "Accounts & Finance",
    "Human Resources",
    "Procurement Management",
    "Dispatch & Logistics",
    "Employee Self-Service",
    "Analytics & Reports",
    "Admin Panel"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Logo />
            <div>
              <h1 className="text-xl font-bold text-foreground">Graven OneDesk</h1>
              <p className="text-sm text-muted-foreground">Business Management Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center space-y-8">
          <Badge variant="secondary" className="mb-4">
            <Star className="w-3 h-3 mr-1" />
            Complete B2B Management Solution
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
            Streamline Your
            <span className="text-primary block">Business Operations</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive business management platform designed for Graven OneDesk. 
            Manage sales, HR, accounts, procurement, and dispatch from a single unified dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Access Platform <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View Demo
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">8+</div>
              <div className="text-sm text-muted-foreground">Integrated Modules</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">3</div>
              <div className="text-sm text-muted-foreground">Branch Locations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Role-Based Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background/50">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for automation companies and B2B operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Comprehensive Module Suite
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              All essential business functions in one integrated platform
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {modules.map((module, index) => (
              <div key={index} className="flex items-center space-x-2 p-4 rounded-lg bg-background border">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{module}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg">
                Start Managing Your Business <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 py-12 px-4">
        <div className="container mx-auto text-center space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <Logo />
            <div>
              <h3 className="text-lg font-semibold">Graven OneDesk</h3>
              <p className="text-sm text-muted-foreground">Business Management Platform</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto text-sm text-muted-foreground">
            <div>
              <strong>Mumbai Head Office</strong><br />
              Business Park, Andheri East<br />
              Mumbai, Maharashtra 400069
            </div>
            <div>
              <strong>Delhi Branch</strong><br />
              Corporate Plaza, CP<br />
              Delhi 110001
            </div>
            <div>
              <strong>Bangalore Branch</strong><br />
              Tech Hub, Whitefield<br />
              Bangalore, Karnataka 560066
            </div>
          </div>

          <div className="pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              © 2025 Graven OneDesk. All rights reserved. | Built with ❤️ using open-source technologies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
