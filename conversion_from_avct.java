/*
This file will convert SQLite database Avct_dbv1.db of old avct project to HSQLDB database Avct_dbv2.db of new avct2 project.
This will also take care of [race] and [tag] conversions.

Dependencies:
hsqldb.jar
sqlite-jdbc.jar
*/

import java.sql.*;

public class Main {

    Connection sqlite;
    Connection hsqldb;

    Main() throws ClassNotFoundException, SQLException {
        long startTime = System.currentTimeMillis();
        Class.forName("org.sqlite.JDBC");
        sqlite = DriverManager.getConnection("jdbc:sqlite:Avct_dbv1.db");
        hsqldb = DriverManager.getConnection("jdbc:hsqldb:file:Avct_dbv2.db;shutdown=true;hsqldb.write_delay=false", "SA", "");
        tag();
        tagRelationship();
        studio();
        clip();
        clipTag();
        record();
        System.out.print("Conversion finished! ");
        System.out.print("Time used: ");
        System.out.print((System.currentTimeMillis() - startTime) / 1000);
        System.out.println(" seconds.");
        hsqldb.close();
    }

    public static void main(String[] args) {
        try {
            new Main();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    void tag() throws SQLException {
        Statement statement = sqlite.createStatement();
        PreparedStatement pstmt = hsqldb.prepareStatement("INSERT INTO \"PUBLIC\".\"tag\" (\"tag_id\", \"name\") VALUES(?, ?)");
        ResultSet rs = statement.executeQuery("SELECT tag_id, name FROM tag");
        while (rs.next()){
            pstmt.setInt(1, rs.getInt(1));
            pstmt.setString(2, rs.getString(2));
            pstmt.executeUpdate();
            System.out.println("Tag " + rs.getInt(1) + " inserted.");
        }
    }

    void tagRelationship() throws SQLException {
        Statement statement = sqlite.createStatement();
        PreparedStatement pstmt = hsqldb.prepareStatement("INSERT INTO \"PUBLIC\".\"tag_relationship\" (\"parent_tag\", \"child_tag\") VALUES(?, ?)");
        ResultSet rs = statement.executeQuery("SELECT parent_tag, child_tag FROM tag_relationship");
        while (rs.next()){
            pstmt.setInt(1, rs.getInt(1));
            pstmt.setInt(2, rs.getInt(2));
            pstmt.executeUpdate();
            System.out.println("Tag relationship " + rs.getInt(1) + ", " + rs.getInt(2) + " inserted.");
        }
    }

    void studio() throws SQLException {
        Statement statement = sqlite.createStatement();
        PreparedStatement pstmt = hsqldb.prepareStatement("INSERT INTO \"PUBLIC\".\"studio\" (\"studio_id\", \"name\") VALUES(? ,?)");
        ResultSet rs = statement.executeQuery("SELECT studio_id, name FROM studio");
        while (rs.next()){
            pstmt.setInt(1, rs.getInt(1));
            pstmt.setString(2, rs.getString(2));
            pstmt.executeUpdate();
            System.out.println("Studio " + rs.getInt(1) + " inserted.");
        }
    }

    static final int[] racemapping = {0, 1, 2, 2, 3, 3};

    void clip() throws SQLException {
        Statement statement = sqlite.createStatement();
        PreparedStatement pstmt = hsqldb.prepareStatement("INSERT INTO \"PUBLIC\".\"clip\" (\"clip_id\", \"file\", \"studio_id\", \"race\", \"thumb\", \"grade\", \"size\", \"length\", \"role\", \"source_note\") VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0, '')");
        ResultSet rs = statement.executeQuery("SELECT clip_id, file, studio_id, race, thumb, grade, size, length FROM clip");
        while (rs.next()){
            pstmt.setInt(1, rs.getInt(1));
            pstmt.setString(2, rs.getString(2));
            int studio = rs.getInt(3);
            if (rs.wasNull()) {
                pstmt.setNull(3, java.sql.Types.INTEGER);
            } else {
                pstmt.setInt(3, studio);
            }
            pstmt.setInt(4, racemapping[rs.getInt(4)]);
            pstmt.setBytes(5, rs.getBytes(5));
            pstmt.setInt(6, rs.getInt(6));
            pstmt.setInt(7, rs.getInt(7));
            pstmt.setInt(8, rs.getInt(8));
            pstmt.executeUpdate();
            System.out.println("Clip " + rs.getInt(1) + " inserted.");
        }
    }

    void recParent(int clipId, int tagId, int level) throws SQLException {
        PreparedStatement pstmte = hsqldb.prepareStatement("SELECT * FROM \"PUBLIC\".\"clip_tag\" WHERE \"clip_id\" = ? AND \"tag_id\" = ?");
        pstmte.setInt(1, clipId);
        pstmte.setInt(2, tagId);
        if (pstmte.executeQuery().next()) {
            return;
        }
        PreparedStatement pstmti = hsqldb.prepareStatement("INSERT INTO \"PUBLIC\".\"clip_tag\" (\"clip_id\", \"tag_id\") VALUES(?, ?)");
        pstmti.setInt(1, clipId);
        pstmti.setInt(2, tagId);
        pstmti.executeUpdate();
        System.out.println("Clip tag " + clipId + ", " + tagId + " inserted, depth " + level + ".");
        PreparedStatement pstmtg = sqlite.prepareStatement("SELECT parent_tag FROM tag_relationship WHERE child_tag = ?");
        pstmtg.setInt(1, tagId);
        ResultSet rsg = pstmtg.executeQuery();
        while (rsg.next()) {
            int parent = rsg.getInt(1);
            recParent(clipId, parent, level + 1);
        }
    }

    void clipTag() throws SQLException {
        Statement statement = sqlite.createStatement();
        ResultSet rs = statement.executeQuery("SELECT clip_id, tag_id FROM clip_tag");
        while (rs.next()){
            recParent(rs.getInt(1), rs.getInt(2), 0);
        }
    }

    void record() throws SQLException {
        Statement statement = sqlite.createStatement();
        PreparedStatement pstmt = hsqldb.prepareStatement("INSERT INTO \"PUBLIC\".\"record\" (\"timestamp\", \"clip_id\") VALUES(?, ?)");
        ResultSet rs = statement.executeQuery("SELECT timestamp, clip_id FROM record");
        while (rs.next()){
            pstmt.setInt(1, rs.getInt(1));
            pstmt.setInt(2, rs.getInt(2));
            pstmt.executeUpdate();
            System.out.println("Record " + rs.getInt(1) + ", " + rs.getInt(2) + " inserted.");
        }
    }

}
