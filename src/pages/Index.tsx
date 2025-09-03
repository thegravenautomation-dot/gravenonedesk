import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardCard } from "@/components/DashboardCard";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout 
      title="Admin Dashboard" 
      subtitle="Welcome back! Here's what's happening at Graven Automation."
    >
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <DashboardCard
          title="Total Revenue"
          value="₹2.4Cr"
          change={{ value: "+12.5% from last month", trend: "up" }}
          icon={DollarSign}
          variant="success"
        />
        <DashboardCard
          title="Active Leads"
          value="348"
          change={{ value: "+5.2% from last week", trend: "up" }}
          icon={Users}
          variant="info"
        />
        <DashboardCard
          title="Orders Pending"
          value="23"
          change={{ value: "-2 from yesterday", trend: "down" }}
          icon={ShoppingCart}
          variant="warning"
        />
        <DashboardCard
          title="Conversion Rate"
          value="24.3%"
          change={{ value: "+1.2% from last month", trend: "up" }}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Create New Lead
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add Purchase Order
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-success mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Order #12345 dispatched</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-info mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Payment received ₹50,000</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-primary mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium">New lead from IndiaMART</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-warning mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Stock running low: Servo Motors</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Approve salary advance</p>
                <p className="text-xs text-muted-foreground">HR Department</p>
              </div>
              <Badge variant="outline">High</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Review quotation #QT-2024-156</p>
                <p className="text-xs text-muted-foreground">Sales Team</p>
              </div>
              <Badge variant="outline">Medium</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Update vendor details</p>
                <p className="text-xs text-muted-foreground">Procurement</p>
              </div>
              <Badge variant="outline">Low</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Branch Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mumbai HQ</span>
                <span className="font-medium">₹85L</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Delhi Branch</span>
                <span className="font-medium">₹62L</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-secondary h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bangalore Branch</span>
                <span className="font-medium">₹45L</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-info h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
