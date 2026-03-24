package com.matjari.pos;

import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.webkit.WebView;
import android.content.Context;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    /**
     * Expose print function to JavaScript via Capacitor bridge
     * Called from JS: window.AndroidPrint.print(html)
     */
    private void printWebContent(String htmlContent) {
        WebView webView = new WebView(this);
        webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null);
        
        webView.postDelayed(() -> {
            PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter("Matjari Invoice");
            PrintAttributes.Builder builder = new PrintAttributes.Builder();
            builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
            printManager.print("Matjari Invoice", printAdapter, builder.build());
        }, 1000);
    }
}
