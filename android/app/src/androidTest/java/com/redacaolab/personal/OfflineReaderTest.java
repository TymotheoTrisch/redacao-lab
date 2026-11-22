package com.redacaolab.personal;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class OfflineReaderTest {
    private static String eval(ActivityScenario<MainActivity> scenario, String js) throws Exception {
        ArrayBlockingQueue<String> result = new ArrayBlockingQueue<>(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(js, result::offer));
        String value = result.poll(5, TimeUnit.SECONDS);
        assertNotNull("WebView sem resposta", value);
        return value;
    }

    private static void await(ActivityScenario<MainActivity> scenario, String condition) throws Exception {
        long end = SystemClock.elapsedRealtime() + 30000;
        do {
            if ("true".equals(eval(scenario, "Boolean(" + condition + ")"))) return;
            SystemClock.sleep(200);
        } while (SystemClock.elapsedRealtime() < end);
        throw new AssertionError("Condição da interface não atendida: " + condition);
    }

    private static void click(ActivityScenario<MainActivity> scenario, String caption) throws Exception {
        String button = "[...document.querySelectorAll('button')].find(b => b.textContent.trim()==='" + caption + "' && !b.disabled)";
        await(scenario, button);
        eval(scenario, button + ".click()");
    }

    @Test public void storesSelectionOffline() throws Exception {
        // Somente o emulador descartável preparado pelo workflow cria dados de teste.
        assumeTrue("yes".equals(InstrumentationRegistry.getArguments().getString("scratch")));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.redacaolab.personal", context.getPackageName());
        assertTrue((context.getApplicationInfo().flags & ApplicationInfo.FLAG_ALLOW_BACKUP) == 0);
        try (ActivityScenario<MainActivity> app = ActivityScenario.launch(MainActivity.class)) {
            await(app, "document.querySelector('button.row:not(:disabled)')");
            eval(app, "document.querySelector('button.row').click()");
            await(app, "document.querySelector('.reading-text span')");
            eval(app, "(()=>{const n=document.querySelector('.reading-text span').firstChild;" +
                "const r=document.createRange();r.setStart(n,0);r.setEnd(n,8);" +
                "const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'))})()");
            click(app,"Anotar trecho");
            await(app,"document.querySelector('textarea')");
            eval(app,"(()=>{const t=document.querySelector('textarea');t.value='Nota sintética de integração';" +
                "t.dispatchEvent(new Event('input',{bubbles:true}))})()");
            click(app,"Salvar anotação");
            await(app,"document.querySelector('mark') && document.body.textContent.includes('Nota sintética de integração')");
            click(app,"Marcar para reforço");
            await(app,"document.body.textContent.includes('Aula marcada para reforço.')");
        }
    }

    @Test public void restoresSelectionOffline() throws Exception {
        assumeTrue("yes".equals(InstrumentationRegistry.getArguments().getString("scratch")));
        try (ActivityScenario<MainActivity> app = ActivityScenario.launch(MainActivity.class)) {
            await(app, "document.querySelector('button.resume:not(:disabled)')");
            eval(app, "document.querySelector('button.resume').click()");
            await(app, "document.querySelector('mark') && document.body.textContent.includes('Nota sintética de integração')");
            await(app, "document.body.textContent.includes('Marcada para reforço')");
        }
    }
}
