package avct2.scalatra

import java.io.{File, InputStream}

import scala.async.Async.{async, await}
import avct.{MpShooter, Output}
import avct2.Avct2Conf
import avct2.desktop.Autocrawl
import avct2.desktop.OpenFile._
import avct2.modules.{ClipTagCheck, Difference}
import avct2.schema.MctImplicits._
import avct2.schema.Utilities._
import avct2.schema._
import javax.sql.rowset.serial.SerialBlob
import org.json4s.JsonAST.JNull
import org.scalatra.CorsSupport
import org.scalatra.FutureSupport
import org.scalatra.servlet.{FileUploadSupport, MultipartConfig}
import slick.jdbc.HsqldbProfile.api._

import scala.compat.Platform
import scala.concurrent.Future

class Avct2Servlet extends NoCacheServlet with FileUploadSupport with JsonSupport with FutureSupport with RenderHelper with CorsSupport {

  protected implicit def executor = scala.concurrent.ExecutionContext.Implicits.global

  configureMultipartHandling(MultipartConfig())

  options("/*") {
    response.setHeader(
      "Access-Control-Allow-Headers", request.getHeader("Access-Control-Request-Headers"));
  }

  def withDb[T](f: Database => Future[T]): Future[T] = f(Avct2Conf.dbConnection.get.database)

  def terminate(status: Int, message: String) = {
    augmentSimpleRequest()
    halt(status, message)
  }

  before() {
    if (request.getMethod.toUpperCase != "OPTIONS") {
      contentType = formats("json")
      Avct2Conf.dbConnection match {
        case None => terminate(412, "Establish a database connection first.")
        case Some(conn) =>
          val header = request.getHeader("X-Db-Connection-Id")
          if (header != conn.id) {
            terminate(412, s"Working DB connection changed. New DB: ${conn.id}");
          }
      }
    }
  }

  get("/players") {
    // available players
    Avct2Conf.getPlayers
  }

  get("/clip") {
    withDb { implicit db =>
      for {
        allTags <- timeFuture("allTags", db.run(Tables.tag.map(tag => (tag.tagId, tag.tagType)).result))
        allClipTags <- timeFuture("allClipTags", db.run(Tables.clipTag.result))
        records <- timeFuture("records", queryRecords(Tables.record))
        clips <- timeFuture("clips", queryClip(identity))
      } yield Future.sequence(clips.map(
        clip => renderClip(clip, Option(allTags.toMap), Option(allClipTags.groupMap(_._1)(_._2)), Option(records))
      ))
    }
  }

  get("/clip/:id/history") {
    val id = params("id").toInt
    withDb(_.run(Tables.record.filter(_.clipId === id).map(_.timestamp).result))
  }

  def openFileHelper(opener: (File => Boolean), record: Boolean) = {
    val id = params("id").toInt
    withDb { implicit db =>
      openFile(id, opener).flatMap {
        case Some(err) => terminate(err._1, err._2)
        case None =>
          if (record) {
            db.run(Tables.record.map(row => (row.clipId, row.timestamp)) += ((id, (Platform.currentTime / 1000).toInt)))
          } else Future.unit // nothing to return
      }
    }
  }

  post("/clip/:id/open") {
    val record = params("record").toBoolean
    openFileHelper(open, record).map(_ => JNull)
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
    openFileHelper(openWith(_, playerFile), true).map(_ => JNull)
  }

  post("/clip/:id/folder") {
    openFileHelper(openInFolder, false).map(_ => JNull)
  }

  get("/clip/:id/thumb") {
    contentType = "image/jpeg" // override
    val id = params("id").toInt
    withDb(_.run(Tables.clip.filter(_.clipId === id).map(_.thumb).result.headOption)).map {
      case Some(Some(thumb)) => thumb.getBinaryStream
      case Some(None) => terminate(503, "Image not set.")
      case None => terminate(404, "Clip does not exist.")
    }
  }

  post("/clip/:id/shot") {
    contentType = "image/png" // override
    val id = params("id").toInt
    for {
      fileName <- withDb(_.run(Tables.clip.filter(_.clipId === id).map(_.file).result.head))
    } yield {
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
    withDb(_.run(Tables.clip.filter(_.clipId === id).map(_.thumb).update(Some(new SerialBlob(toJpeg(fis))))).map({
      case 1 => JNull
      case _ => terminate(404, "No single clip updated.")
    }))
  }

  post("/clip/:id/delete") {
    val id = params("id").toInt
    withDb { db =>
      val clipRow = Tables.clip.filter(_.clipId === id)
      db.run(clipRow.map(_.file).result.headOption).map {
        case Some(fileName) =>
          val f = new File(new File(Avct2Conf.getVideoDir), fileName)
          if (f.exists()) {
            terminate(412, "File still exists.")
          } else {
            db.run(DBIO.seq(
              Tables.clipTag.filter(_.clipId === id).delete,
              Tables.record.filter(_.clipId === id).delete,
              clipRow.delete
            )).map(_ => JNull)
          }
        case None => terminate(404, "Clip does not exist.")
      }
    }
  }

  post("/clip/:id/edit") {
    val id = params("id").toInt
    val value = params("value")
    withDb { implicit db =>
      val clipRowQuery = Tables.clip.filter(_.clipId === id)
      db.run(clipRowQuery.map(clip => (clip.race, clip.role)).result.head)
        .flatMap(clipRow => {
          params("key") match {
            case "race" =>
              val race = try {
                Race.withName(value)
              } catch {
                case _: NoSuchElementException => terminate(404, "Race does not exist.")
              }
              db.run(clipRowQuery.map(_.race).update(race))
            case "role" =>
              val roles = json[Seq[String]](value)
              val roleSet = try {
                Role.ValueSet(roles.map(Role.withName): _*)
              } catch {
                case _: NoSuchElementException => terminate(404, "Role does not exist.")
              }
              db.run(clipRowQuery.map(_.role).update(roleSet))
            case "grade" =>
              val grade = value.toInt
              db.run(clipRowQuery.map(_.grade).update(grade))
            case "duration" =>
              val length = value.toInt
              db.run(clipRowQuery.map(_.length).update(length))
            case "tags" =>
              val tags = json[Seq[Int]](value)
              db.run(Tables.tag.filter(_.tagId inSet tags).map(tag => (tag.tagId, tag.tagType)).result).map(tagRows => {
                if (tagRows.length < tags.size) {
                  terminate(404, "Tag does not exist.")
                }
                tagRows.filter(_._2 == TagType.studio).map(_._1).toSet
              }).flatMap(studioIds => for {
                  _ <- db.run(Tables.clipTag.filter(clipTag => clipTag.clipId === id).delete)
                  _ <- if (clipRow._1 == Race.unknown) updateRaceAutomaticallyAccordingToStudio(id, studioIds) else Future.unit
                  _ <- if (clipRow._2.isEmpty) updateRolesAutomaticallyAccordingToStudio(id, studioIds) else Future.unit
                  tagsIncludingParents <- Future.sequence(tags.map(tag => getParentOrChildTags(tag, true, true))).map(_.fold(Set[Int]())(_ ++ _) ++ tags) // duplicates removed
                } yield tagsIncludingParents)
                .flatMap(tagsIncludingParents =>
                  db.run(Tables.clipTag.map(row => (row.clipId, row.tagId)) ++= tagsIncludingParents.map(tag => (id, tag)))
                )
            case "sourceNote" =>
              db.run(clipRowQuery.map(_.sourceNote).update(value))
          }
        })
        .flatMap(_ => queryClip(query => query.filter(_.clipId === id)))
        .flatMap(clips => renderClip(clips.head, Option.empty, Option.empty, Option.empty))
    }
  }

  get("/clip/:id/similar") {
    val id = params("id").toInt
    withDb { implicit db =>
      db.run(Tables.clip.filter(_.clipId === id).exists.result).flatMap(exists => {
        if (!exists) {
          terminate(404, "Clip does not exist.")
        }
        Difference.scanAll(id)
      })
    }
  }

  post("/clip/autocrawl") {
    withDb(Autocrawl.apply)
  }

  get("/tag") {
    withDb { implicit db =>
      db.run(Tables.tag.map(tag => (tag.tagId, tag.name, tag.description, tag.bestOfTag, tag.tagType)).result).flatMap(rows => Future.sequence(rows.map(tag => for {
        parents <- getParentOrChildTags(tag._1, true, false)
      } yield Map("id" -> tag._1, "name" -> tag._2, "parent" -> parents, "description" -> tag._3, "best" -> tag._4, "type" -> tag._5.toString))))
    }
  }

  post("/tag/:id/setbest") {
    val id = params("id").toInt
    val clip = params("clip").toInt
    withDb { implicit db =>
      db.run(Tables.clipTag.filter(row => (row.tagId === id) && (row.clipId === clip)).exists.result).flatMap(exists => {
        if (!exists) {
          terminate(409, "Clip does not belong to such tag.")
        }
        db.run(Tables.tag.filter(_.tagId === id).map(_.bestOfTag).update(Some(clip)))
      }).map(_ => JNull) // nothing to return
    }
  }

  post("/tag/:id/edit") {
    val id = params("id").toInt
    val name = params("name")
    if (name.length < 1) {
      terminate(400, "Name too short.")
    }
    withDb { db =>
      (for {
        tagIdExists <- db.run(Tables.tag.filter(_.tagId === id).exists.result)
        tagNameExists <- db.run(Tables.tag.filter(tag => (tag.tagId =!= id) && (tag.name === name)).exists.result)
      } yield {
        if (!tagIdExists) {
          terminate(404, "Tag does not exist.")
        }
        if (tagNameExists) {
          terminate(409, "Tag name already exists.")
        }
      }).flatMap(_ => db.run(Tables.tag.filter(_.tagId === id).map(_.name).update(name)))
        .map(_ => JNull) // nothing to return
    }
  }

  post("/tag/:id/description") {
    val id = params("id").toInt
    val description = params("description")
    if (description.length < 1) {
      terminate(400, "description too short.")
    }
    withDb(_.run(Tables.tag.filter(_.tagId === id).map(_.description).update(Some(description))).map({
      case 1 => JNull
      case _ => terminate(404, "No single clip updated.")
    }))
  }

  post("/tag/:id/parent") {
    val id = params("id").toInt
    val parents = json[Seq[Int]](params("parent")).toSet // remove duplicates
    withDb { implicit db =>
      (for {
        childExists <- db.run(Tables.tag.filter(_.tagId === id).exists.result)
        existingParentsCount <- db.run(Tables.tag.filter(_.tagId inSet parents).length.result)
        legal <- Future.sequence(parents.map(parent => legalTagParent(id, parent)))
      } yield {
        if (!childExists) {
          terminate(404, "Child tag does not exist.")
        }
        if (existingParentsCount < parents.size) {
          terminate(404, "Parent tag does not exist.")
        }
        if (!legal.forall(identity)) {
          terminate(409, "Forming cycles or different types are not allowed.")
        }
      }).flatMap(_ => db.run(Tables.tagRelationship.filter(_.childTag === id).delete))
        .flatMap(_ => db.run(Tables.tagRelationship.map(row => (row.parentTag, row.childTag)) ++= parents.toSeq.map(parent => (parent, id))))
        .map(_ => JNull)
    }
  }

  post("/tag/auto") {
    val dryRun = params("dry").toBoolean
    withDb { implicit db =>
      db.run(Tables.clip.map(clip => (clip.clipId, clip.file)).result)
        .flatMap(clips => Future.sequence(clips.map(entry => async {
          val tagIds = await(ClipTagCheck.check(entry._1))
          if (!dryRun) {
            await(ClipTagCheck.actualRun(entry._1, tagIds))
          }
          new ClipTagCheck(entry._2, await(ClipTagCheck.tagNames(tagIds)))
        })))
        .map(_.filter(_.problematicTags.nonEmpty))
    }
  }

  post("/tag/create") {
    val tagType = TagType.withName(params("type"))
    // return inserted id
    val name = params("name")
    if (name.length < 1) {
      terminate(400, "Name too short.")
    }
    withDb(db => async {
      if (await(db.run(Tables.tag.filter(_.name === name).exists.result))) {
        terminate(409, "Name already exists.")
      }
      await(db.run((Tables.tag returning Tables.tag) += (None, name, None, None, tagType))) match {
        case (Some(id), _, _, _, _) => Map("id" -> id)
        case _ => terminate(500, "Insertion failed.")
      }
    })
  }
}