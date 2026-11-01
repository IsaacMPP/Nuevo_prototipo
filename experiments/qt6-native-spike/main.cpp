#include <QGuiApplication>
#include <QObject>
#include <QUrl>
#include <QFileInfo>
#include <QImage>
#include <QPainter>
#include <QQuickPaintedItem>
#include <QMediaPlayer>
#include <QAudioOutput>
#include <QVideoSink>
#include <QVideoFrame>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QLibrary>
#include <QDebug>
#include <QTimer>
#include <QPointer>

// Deliberately independent of Electron, FreeShow and production JA settings.
// Qt Multimedia is an exploratory backend; NOT libobs video compositing.
class Media final : public QObject {
    Q_OBJECT
    Q_PROPERTY(QUrl source READ source NOTIFY sourceChanged)
    Q_PROPERTY(QString title READ title NOTIFY sourceChanged)
    Q_PROPERTY(qint64 position READ position NOTIFY positionChanged)
    Q_PROPERTY(qint64 duration READ duration NOTIFY durationChanged)
    Q_PROPERTY(bool playing READ playing NOTIFY playingChanged)
    Q_PROPERTY(bool muted READ muted WRITE setMuted NOTIFY mutedChanged)
    Q_PROPERTY(int volume READ volume WRITE setVolume NOTIFY volumeChanged)
    Q_PROPERTY(QString error READ error NOTIFY errorChanged)
public:
    explicit Media(QObject *parent=nullptr):QObject(parent) {
        player.setAudioOutput(&audio);
        player.setVideoSink(&sink);
        audio.setVolume(.8f);
        connect(&player,&QMediaPlayer::positionChanged,this,&Media::positionChanged);
        connect(&player,&QMediaPlayer::durationChanged,this,&Media::durationChanged);
        connect(&player,&QMediaPlayer::playbackStateChanged,this,[this]{emit playingChanged();});
        connect(&player,&QMediaPlayer::errorOccurred,this,[this](QMediaPlayer::Error,const QString &message){err=message;emit errorChanged();});
        connect(&audio,&QAudioOutput::volumeChanged,this,&Media::volumeChanged);
        connect(&audio,&QAudioOutput::mutedChanged,this,&Media::mutedChanged);
        // Exactly one frame conversion per Program video frame for all Program views.
        connect(&sink,&QVideoSink::videoFrameChanged,this,[this](const QVideoFrame &f){image=f.toImage();emit frameChanged();});
    }
    QUrl source() const{return player.source();}
    QString title() const{return player.source().fileName();}
    qint64 position() const{return player.position();}
    qint64 duration() const{return player.duration();}
    bool playing() const{return player.playbackState()==QMediaPlayer::PlayingState;}
    bool muted() const{return audio.isMuted();}
    int volume() const{return qRound(audio.volume()*100);}
    QString error() const{return err;}
    const QImage &frame() const{return image;}
    Q_INVOKABLE void prepare(const QUrl &url){
        if(!url.isLocalFile()||!QFileInfo(url.toLocalFile()).isFile()){err="Selecciona un archivo local existente";emit errorChanged();return;}
        player.stop(); image=QImage();emit frameChanged();err.clear();emit errorChanged();
        player.setSource(url);emit sourceChanged();
    }
    Q_INVOKABLE void toggle(){playing()?player.pause():player.play();}
    Q_INVOKABLE void play(){player.play();}
    Q_INVOKABLE void restart(){player.setPosition(0);player.play();}
    Q_INVOKABLE void stop(){player.stop();}
    Q_INVOKABLE void clear(){player.stop();player.setSource(QUrl());image=QImage();emit frameChanged();emit sourceChanged();}
    Q_INVOKABLE void seek(qint64 value){player.setPosition(qBound(qint64(0),value,duration()));}
    Q_INVOKABLE void setMuted(bool value){audio.setMuted(value);}
    Q_INVOKABLE void setVolume(int value){audio.setVolume(qBound(0,value,100)/100.f);}
signals:
    void sourceChanged();
    void positionChanged();
    void durationChanged();
    void playingChanged();
    void mutedChanged();
    void volumeChanged();
    void errorChanged();
    void frameChanged();
private:
    QMediaPlayer player;
    QAudioOutput audio;
    QVideoSink sink;
    QImage image;
    QString err;
};

class FrameSurface:public QQuickPaintedItem {
    Q_OBJECT
    Q_PROPERTY(Media *media READ media WRITE setMedia NOTIFY mediaChanged)
public:
    explicit FrameSurface(QQuickItem *p=nullptr):QQuickPaintedItem(p){}
    Media *media() const{return m;}
    void setMedia(Media *next){
        if(m==next)return;
        disconnect(connection);m=next;
        if(m)connection=connect(m,&Media::frameChanged,this,[this]{update();});
        emit mediaChanged();update();
    }
    void paint(QPainter *p) override {
        p->fillRect(boundingRect(),Qt::black);
        if(!m||m->frame().isNull())return;
        const auto &frame=m->frame();
        QSizeF fitted=frame.size().scaled(size().toSize(),Qt::KeepAspectRatio);
        QRectF dest((width()-fitted.width())/2,(height()-fitted.height())/2,fitted.width(),fitted.height());
        p->drawImage(dest,frame);
    }
signals:
    void mediaChanged();
private:
    QPointer<Media> m;
    QMetaObject::Connection connection;
};

static QString obsProbe() {
    // Only checks the DLL and symbol. Does NOT initialize or use libobs.
    QLibrary obs("obs");
    return obs.load() && obs.resolve("obs_startup")
        ? QStringLiteral("DLL detectada: libobs SIN integrar")
        : QStringLiteral("libobs no detectada: integración pendiente");
}
int main(int argc,char **argv){
    QGuiApplication app(argc,argv);
    app.setApplicationName("JA · Qt nativo (solo experimento)");
    qmlRegisterUncreatableType<Media>("JA.Native",1,0,"Media","Instancias controladas por C++");
    qmlRegisterType<FrameSurface>("JA.Native",1,0,"FrameSurface");
    Media preview,program;
    preview.setMuted(true);
    if(app.arguments().contains("--self-test")){
        preview.setVolume(37);
        if(&preview==&program||preview.volume()!=37||program.volume()==37)return 1;
        program.setMuted(true);
        if(!preview.muted()||!program.muted())return 2;
        qInfo()<<"PASS: motores Qt independientes. "<<obsProbe();
        return 0;
    }
    QQmlApplicationEngine qml;
    qml.rootContext()->setContextProperty("previewEngine",&preview);
    qml.rootContext()->setContextProperty("programEngine",&program);
    qml.rootContext()->setContextProperty("obsStatus",obsProbe());
    qml.loadFromModule("JA.Spike","Main");
    if(qml.rootObjects().isEmpty())return 1;
    if(app.arguments().contains("--ui-smoke"))QTimer::singleShot(400,&app,&QCoreApplication::quit);
    return app.exec();
}
#include "main.moc"
