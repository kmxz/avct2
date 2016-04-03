package avct2.scalatra

import java.io.{File, InputStream}
import javax.sql.rowset.serial.SerialBlob

import avct.{MpShooter, Output}
import avct2.Avct2Conf
import avct2.desktop.Autocrawl
import avct2.desktop.OpenFile._
import avct2.modules.{ClipTagCheck, Difference}
import avct2.schema.Utilities._
import avct2.schema._
import org.json4s.JsonAST.JNull
import org.scalatra.servlet.{FileUploadSupport, MultipartConfig}

import scala.compat.Platform
import scala.slick.driver.HsqldbDriver.ReturningInsertInvokerDef
import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.lifted

class Avct2Servlet extends NoCacheServlet with FileUploadSupport with JsonSupport with RenderHelper {

  configureMultipartHandling(MultipartConfig())

  def db() = {
    Avct2Conf.dbConnection.get.database
  }

  def terminate(status: Int, message: String) = {
    halt(status, headers = Map("X-Error" -> message))
  }

  before() {
    contentType = formats("json")
    Avct2Conf.dbConnection match {
      case None => terminate(412, "Establish a database connection first.")
      case Some(conn) =>
        val header = request.getHeader("X-Db-Connection-Id")
        if (header != conn.id) {
          terminate(412, "Working DB connection changed.");
        }
    }
  }

  get("/players") {
    // available players
    Avct2Conf.getPlayers
  }

  get("/clip") {
    db.withSession { implicit session =>
      queryClip(identity).list.map(renderClip)
    }
  }

  get("/clip/:id/history") {
    val id = params("id").toInt
    db().withSession { implicit session =>
      Tables.record.filter(_.clipId === id).map(_.timestamp).list
    }
  }

  def openFileHelper(opener: (File => Boolean), record: Boolean) = {
    val id = params("id").toInt
    db().withSession { implicit session =>
      openFile(id, opener) match {
        case Some(err) => terminate(err._1, err._2)
        case None =>
          if (record) {
            Tables.record.map(row => (row.clipId, row.timestamp)).insert((id, (Platform.currentTime / 1000).toInt))
          }
          JNull // nothing to return
      }
    }
  }

  post("/clip/:id/open") {
    val record = params("record").toBoolean
    openFileHelper(open, record)
  }

  post("/clip/:id/openwith") {
    val player = params("player")
    if (!Avct2Conf.getPlayers.contains(player)) {
      terminate(404, "Such player is not registered.")
    }
    val playerFile = new File(player)
    if (!playerFile.isFile) {
      terminate(503, "Player executable does not exist.")
    }
    openFileHelper(openWith(_, playerFile), true)
  }

  post("/clip/:id/folder") {
    openFileHelper(openInFolder, false)
  }

  get("/clip/:id/thumb") {
    contentType = "image/jpeg" // override
    val id = params("id").toInt
    db().withSession { implicit session =>
      Tables.clip.filter(_.clipId === id).map(_.thumb).firstOption match {
        case Some(Some(thumb)) => org.scalatra.util.io.copy(thumb.getBinaryStream, response.getOutputStream)
        case Some(None) => terminate(503, "Image not set.")
        case None => terminate(404, "Clip does not exist.")
      }
    }
  }

  post("/clip/:id/shot") {
    contentType = "image/png" // override
    val id = params("id").toInt
    db().withSession { implicit session =>
      val clipRow = Tables.clip.filter(_.clipId === id)
      if (!clipRow.exists.run) {
        terminate(404, "Clip does not exist.")
      }
      val fileName = clipRow.map(_.file).first
      val file = new File(new File(Avct2Conf.getVideoDir), fileName)
      if (!file.isFile) {
        terminate(503, "File does not exist.")
      }
      MpShooter.run(file, new Output {
        override def copy(s: InputStream) = org.scalatra.util.io.copy(s, response.getOutputStream)
      })
    }
  }

  post("/clip/:id/saveshot") {
    val id = params("id").toInt
    val fis = fileParams("file").getInputStream
    db().withSession { implicit session =>
      val clipRow = Tables.clip.filter(_.clipId === id)
      if (!clipRow.exists.run) {
        terminate(404, "Clip does not exist.")
      }
      clipRow.map(_.thumb).update(Some(new SerialBlob(toJpeg(fis))))
      JNull
    }
  }

  post("/clip/:id/delete") {
    val id = params("id").toInt
    db().withSession { implicit session =>
      val clipRow = Tables.clip.filter(_.clipId === id)
      clipRow.map(_.file).firstOption match {
        case Some(fileName) =>
          val f = new File(new File(Avct2Conf.getVideoDir), fileName)
          if (f.exists()) {
            terminate(412, "File still exists.")
          } else {
            Tables.clipTag.filter(_.clipId === id).delete
            Tables.record.filter(_.clipId === id).delete
            clipRow.delete
            JNull
          }
        case None => terminate(404, "Clip does not exist.")
      }
    }
  }

  post("/clip/:id/edit") {
    val id = params("id").toInt
    val value = params("value")
    db().withSession { implicit session =>
      val clipRow = Tables.clip.filter(_.clipId === id)
      if (!clipRow.exists.run) {
        terminate(404, "Clip does not exist.")
      }
      params("key") match {
        case "studio" =>
          val studio = value.toInt
          if (studio != 0) {
            if (!Tables.studio.filter(_.studioId === studio).exists.run) {
              terminate(404, "Studio does not exist.")
            }
            if (clipRow.map(_.race).first == Race.unknown) {
              updateRaceAutomaticallyAccordingToStudio(id, studio)
            }
            if (clipRow.map(_.role).first.isEmpty) {
              updateRolesAutomaticallyAccordingToStudio(id, studio)
            }
          }
          clipRow.map(_.studioId).update(Some(studio))
        case "race" =>
          try {
            val race = Race.withName(value)
            clipRow.map(_.race).update(race)
          } catch {
            case _: NoSuchElementException => terminate(404, "Race does not exist.")
          }
        case "role" =>
          val roles = json[Seq[String]](value)
          try {
            val roleSet = Role.ValueSet(roles.map(Role.withName): _*)
            clipRow.map(_.role).update(roleSet)
          } catch {
            case _: NoSuchElementException => terminate(404, "Role does not exist.")
          }
        case "grade" =>
          val grade = value.toInt
          clipRow.map(_.grade).update(grade)
        case "duration" =>
          val length = value.toInt
          clipRow.map(_.length).update(length)
        case "tags" =>
          val tags = json[Seq[Int]](value)
          Tables.clipTag.filter(_.clipId === id).delete // remove older ones first
          if (!tags.forall(tag => Tables.tag.filter(_.tagId === tag).exists.run)) {
            terminate(404, "Tag does not exist.")
          }
          val tagsIncludingParents = tags.map(tag => getParentOrChildTags(tag, true, true) + tag).fold(Set[Int]())(_ ++ _).toSeq // duplicates removed
          Tables.clipTag.map(row => (row.clipId, row.tagId)).insertAll(tagsIncludingParents.map(tag => (id, tag)): _*)
        case "sourceNote" =>
          clipRow.map(_.sourceNote).update(value)
      }
      // render the new clip
      renderClip(queryClip(query => query.filter(_.clipId === id)).first)
    }
  }

  get("/clip/:id/similar") {
    val id = params("id").toInt
    db().withSession { implicit session =>
      if (!Tables.clip.filter(_.clipId === id).exists.run) {
        terminate(404, "Clip does not exist.")
      }
      Difference.scanAll(id)
    }
  }

  post("/clip/autocrawl") {
    db().withSession { session => Autocrawl(session)}
  }

  get("/tag") {
    db().withSession { implicit session =>
      Tables.tag.map(tag => (tag.tagId, tag.name)).list.map(tag => Map("id" -> tag._1, "name" -> tag._2, "parent" -> getParentOrChildTags(tag._1, true, false)))
    }
  }

  post("/tag/:id/edit") {
    val id = params("id").toInt
    val name = params("name")
    if (name.length < 1) {
      terminate(400, "Name too short.")
    }
    db().withSession { implicit session =>
      if (!Tables.tag.filter(_.tagId === id).exists.run) {
        terminate(404, "Tag does not exist.")
      }
      if (Tables.tag.filter(tag => (tag.tagId =!= id) && (tag.name === name)).exists.run) {
        terminate(409, "Tag name already exists.")
      }
      Tables.tag.filter(_.tagId === id).map(_.name).update(name)
      JNull // nothing to return
    }
  }

  post("/tag/:id/parent") {
    val id = params("id").toInt
    val parents = json[Seq[Int]](params("parent")).toSet // remove duplicates
    db().withSession { implicit session =>
      if (!Tables.tag.filter(_.tagId === id).exists.run) {
        terminate(404, "Child tag does not exist.")
      }
      if (!parents.forall(tag => Tables.tag.filter(_.tagId === tag).exists.run)) {
        terminate(404, "Parent tag does not exist.")
      }
      if (!parents.forall(tag => legalTagParent(id, tag))) {
        terminate(409, "Forming cycles are not allowed.")
      }
      Tables.tagRelationship.filter(_.childTag === id).delete
      Tables.tagRelationship.map(row => (row.parentTag, row.childTag)).insertAll(parents.toSeq.map(parent => (parent, id)): _*)
      JNull // nothing to return
    }
  }

  post("/tag/auto") {
    val dryRun = params("dry").toBoolean
    db().withSession { implicit session =>
      val clips = Tables.clip.map(clip => (clip.clipId, clip.file)).list
      clips.map(entry => {
        val tagIds = ClipTagCheck.check(entry._1)
        if (!dryRun) {
          ClipTagCheck.actualRun(entry._1, tagIds)
        }
        new ClipTagCheck(entry._2, ClipTagCheck.tagNames(tagIds))
      }).filter(_.problematicTags.length > 0)
    }
  }

  def createHelper(filter: (String => lifted.Query[_, (Option[Int], String), Seq]), returningInvoker: ReturningInsertInvokerDef[(Option[Int], String), (Option[Int], String)]) = {
    // return inserted id
    val name = params("name")
    if (name.length < 1) {
      terminate(400, "Name too short.")
    }
    db().withSession { implicit session =>
      if (filter(name).exists.run) {
        terminate(409, "Name already exists.")
      }
      (returningInvoker +=(None, name)) match {
        case (Some(id), _) => Map("id" -> id)
        case _ => terminate(500, "Insertion failed.")
      }
    }
  }

  post("/tag/create") {
    createHelper(name => Tables.tag.filter(_.name === name), Tables.tag returning Tables.tag)
  }

  get("/studio") {
    db().withSession { implicit session =>
      Tables.studio.map(studio => (studio.studioId, studio.name)).list.map(studio => (studio._1.toString, studio._2)).toMap
    }
  }

  post("/studio/create") {
    createHelper(name => Tables.studio.filter(_.name === name), Tables.studio returning Tables.studio)
  }

}