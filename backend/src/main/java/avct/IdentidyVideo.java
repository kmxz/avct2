// slightly-modified from original Java-written avct code. no time to rewrite it in Scala
package avct;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashMap;

class IdentifyVideo {

    static final HashMap<String, String> identify(File fp, String mpCommand) throws IOException, InterruptedException {
        HashMap<String, String> output = new HashMap<String, String>();
        String[] command = { mpCommand, "-vo", "null", "-ao", "null", "-really-quiet", "-frames", "0", "-identify", fp.getCanonicalPath() };
        Process pr = new ProcessBuilder(command).start();
        pr.waitFor();
        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(pr.getInputStream(), "UTF-8"));
        String line = bufferedReader.readLine();
        while(line != null){
            if (line.startsWith("ID_")) {
                String[] split = line.substring(3).split("=", 2);
                if (split.length > 1) {
                    output.put(split[0], split[1]);
                }
            }
            line = bufferedReader.readLine();
        }
        return output;
    }

    static final int getDuration(File fp, String mpCommand) throws IOException, InterruptedException {
        HashMap<String, String> hm = identify(fp, mpCommand);
        if (hm.containsKey("LENGTH")) {
            return Math.round(Float.parseFloat(hm.get("LENGTH")));
        }
        return 0;
    }

}
