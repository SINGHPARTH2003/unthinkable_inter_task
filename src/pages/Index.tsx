import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Activity, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Condition {
  name: string;
  likelihood: "high" | "medium" | "low";
  description: string;
}

interface AnalysisResult {
  probable_conditions: Condition[];
  recommendations: string;
  disclaimer: string;
}

const Index = () => {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      toast.error("Please enter your symptoms");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-symptoms', {
        body: { symptoms }
      });

      if (error) throw error;

      setResult(data);
      toast.success("Analysis complete");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Healthcare Symptom Checker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered symptom analysis for educational purposes. Get insights about possible conditions and recommendations.
          </p>
        </div>

        {/* Disclaimer Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Medical Disclaimer:</strong> This tool is for educational purposes only and should NOT replace professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.
          </AlertDescription>
        </Alert>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Describe Your Symptoms</CardTitle>
            <CardDescription>
              Please describe your symptoms in detail. Include when they started, severity, and any relevant information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: I've had a persistent headache for 3 days, along with mild fever and fatigue..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[150px] resize-none"
              disabled={loading}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !symptoms.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="mr-2 h-4 w-4" />
                  Analyze Symptoms
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Probable Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Possible Conditions
                </CardTitle>
                <CardDescription>
                  Based on the symptoms you described, here are some possibilities:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.probable_conditions.map((condition, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-lg">{condition.name}</h3>
                      <Badge variant={getLikelihoodColor(condition.likelihood)}>
                        {condition.likelihood} likelihood
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{condition.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line">{result.recommendations}</p>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            {result.disclaimer && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {result.disclaimer}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Built with Lovable Cloud • Powered by AI • For Educational Use Only</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
