// slightly-modified from original Java-written avct code. no time to rewrite it in Scala
package avct;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashMap;

public class IdentifyVideo {

    private HashMap<String, String> hm;

    private IdentifyVideo(HashMap<String, String> parsed) {
        hm = parsed;
    }

    public static IdentifyVideo identify(File fp, String mpCommand) throws IOException, InterruptedException {
        HashMap<String, String> output = new HashMap<>();
        String[] command = {mpCommand, "-vo", "null", "-ao", "null", "-really-quiet", "-frames", "0", "-identify", fp.getCanonicalPath()};
        Process pr = new ProcessBuilder(command).start();
        pr.waitFor();
        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(pr.getInputStream(), "UTF-8"));
        String line = bufferedReader.readLine();
        while (line != null) {
            if (line.startsWith("ID_")) {
                String[] split = line.substring(3).split("=", 2);
                if (split.length > 1) {
                    output.put(split[0], split[1]);
                }
            }
            line = bufferedReader.readLine();
        }
        return new IdentifyVideo(output);
    }

    public int getDuration() {
        if (hm.containsKey("LENGTH")) {
            return Math.round(Float.parseFloat(hm.get("LENGTH")));
        }
        return 0;
    }

    public int getWidth() {
        if (hm.containsKey("VIDEO_WIDTH")) {
            return Integer.parseInt(hm.get("VIDEO_WIDTH"));
        }
        return 0;
    }

    public int getHeight() {
        if (hm.containsKey("VIDEO_HEIGHT")) {
            return Integer.parseInt(hm.get("VIDEO_HEIGHT"));
        }
        return 0;
    }

}