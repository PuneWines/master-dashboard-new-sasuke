import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "./ui/use-toast";

interface WhatsAppShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumber: string;
  setWhatsappNumber: (number: string) => void;
  selectedDocuments: Array<{
    id: number; name: string; serialNo: string; documentType: string; category: string;
  }>;
  onShare: (number: string) => Promise<any>;
}

export function WhatsAppShareDialog({
  open, onOpenChange, whatsappNumber, setWhatsappNumber, selectedDocuments, onShare,
}: WhatsAppShareDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handleShare = async () => {
    if (!whatsappNumber) {
      toast({ title: "Error", description: "Please enter a WhatsApp number", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await onShare(whatsappNumber);
      toast({ title: "Success", description: "Documents shared via WhatsApp successfully" });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to share documents via WhatsApp", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-700">Share Documents via WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dm-whatsapp-number">WhatsApp Number</Label>
            <Input
              id="dm-whatsapp-number"
              placeholder="Enter WhatsApp number (with country code)"
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="border-gray-300 focus:border-green-500"
            />
            <p className="text-xs text-gray-500">Include country code (e.g., +91XXXXXXXXXX)</p>
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Selected Documents:</p>
            <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
              <ul className="space-y-1">
                {selectedDocuments.map((doc) => (
                  <li key={doc.id} className="text-sm flex items-center">
                    <FileText className="h-3 w-3 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{doc.name} ({doc.serialNo})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleShare}
            disabled={!whatsappNumber || isSending}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto"
          >
            {isSending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
            ) : "Share via WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
