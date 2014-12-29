package avct;

import avct2.Avct2Conf;

import java.io.*;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MpShooter {

    private static MpShooter instance = null;

    private static final DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");

    private static final String lineBreak = System.getProperty("line.separator");

    private Process pr;

    private InputStream stdin;

    private InputStream stderrin;

    private PrintStream mplayer;

    private File preview_img_file;

    private final BufferedWriter error_log;

    private final String filePath;

    private final File screenshotPath = new File(Avct2Conf.getVideoDirSubDir(), "screenshots");

    private static final Pattern screenshot_fn_regex = Pattern.compile(".*screenshot \'([A-Za-z0-9.]+)\'.*");

    private Output output;

    public static void run(File fp, Output op) {
        if (instance != null) { return; }
        try {
            instance = new MpShooter(fp, op);
            instance.startMplayer();
            instance.waitFor();
        } catch (IOException e) {
            e.printStackTrace(); // by default
        } finally {
            instance = null;
        }
    }

    private MpShooter(File fp, Output op) throws IOException {
        filePath = fp.getCanonicalPath();
        output = op;
        error_log = new BufferedWriter(new FileWriter(new File(Avct2Conf.getVideoDirSubDir(), "mplayer_error.log")));
    }

    private void startMplayer() {
        List<String> command = new ArrayList<>();
        command.add(Avct2Conf.getMPlayer());
        command.add(filePath);
        ProcessBuilder pb = new ProcessBuilder(command);
        screenshotPath.mkdirs();
        pb.directory(screenshotPath);
        try {
            pr = pb.start();
            mplayer = new PrintStream(pr.getOutputStream());
            stderrin = pr.getErrorStream();
            stdin = pr.getInputStream();
            new Thread(listenOnStdIn).start();
            new Thread(listenOnStdErrIn).start();
        } catch (IOException e) {
            log(e.getMessage());
        }
    }

    private void command(String cmd) {
        mplayer.print(cmd);
        mplayer.print("\n");
        mplayer.flush();
    }

    private void close(boolean force) throws IOException {
        for (File file: screenshotPath.listFiles()) { file.delete(); } // clear up the dir
        stdin.close();
        stderrin.close();
        if (force) {
            pr.destroy();
        } else {
            command("quit");
            waitFor();
        }
        mplayer.close();
    }

    private void log(String to_log) {
        try {
            error_log.write(dateFormat.format(new Date()) + ": ");
            error_log.write(to_log);
            error_log.write("[" + filePath + "]");
            error_log.write(lineBreak);
            error_log.flush();
        } catch (IOException e) {
            e.printStackTrace(); // by default
        }
    }

    private final Runnable listenOnStdIn = new Runnable() {
        public void run() {
            try {
                final BufferedReader lReader = new BufferedReader(new InputStreamReader(stdin, "UTF-8"));
                for (String l = lReader.readLine(); l != null; l = lReader.readLine()) {
                    Matcher matcher = screenshot_fn_regex.matcher(l);
                    if (matcher.matches()) {
                        preview_img_file = new File(screenshotPath, matcher.group(1));
                        syncCheck();
                    }
                }
            } catch (IOException e) {
                log(e.getMessage());
            }
        }
    };

    private final Runnable listenOnStdErrIn = new Runnable() {
        public void run() {
            try {
                final BufferedReader lReader = new BufferedReader(new InputStreamReader(stderrin, "UTF-8"));
                for (String l = lReader.readLine(); l != null; l = lReader.readLine()) {
                    log(l);
                }
            } catch (IOException e) {
                log(e.getMessage());
            }
        }
    };

    private int waitFor() {
        try {
            return pr.waitFor();
        } catch (InterruptedException e) {
            pr.destroy();
            return -1;
        }
    }

    private void syncCheck() throws IOException {
        long startTime = System.currentTimeMillis();
        while (true) {
            try {
                FileInputStream fis = new FileInputStream(preview_img_file);
                output.copy(fis);
                close(false);
                break;
            } catch (FileNotFoundException e) {
                if (System.currentTimeMillis() - startTime > 200) {
                    log("A valid screenshot cannot be read within 200 ms.");
                    break;
                }
            }
        }
    }

}