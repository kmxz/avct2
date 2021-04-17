package avct;

import java.io.InputStream;

public interface Output {
    void resolve(InputStream s);
    void reject(Throwable e);
}
