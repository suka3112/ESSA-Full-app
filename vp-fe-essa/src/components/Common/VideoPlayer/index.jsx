import React, { useState } from "react";
import ReactPlayer from "react-player";
import { IconButton } from "@mui/material";
import "./VideoPlayer.scss";
import { Close } from "@mui/icons-material";

const VideoPlayer = ({ src, onClose, thumbnail }) => {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);


  return (
    <div id="video-container" className={`relative w-full max-w-[800px] mx-auto aspect-video ${playing ? "expanded" : ""}`} >
      <IconButton
      onClick={onClose}
      className="!absolute top-3 right-2 bg-black text-white rounded-full z-10"
      style={{ padding:'1px' }}
    >
      <Close  style={{ width: '18px', height: '18px' }}/>
    </IconButton>
      <ReactPlayer
        url={src}
        playing={playing}
        muted={muted}
        controls={true}
        className="react-player"
        width="100%"
        height="100%"
        light={!playing ? thumbnail : undefined} // Show thumbnail when not playing
        // playIcon={
        //   <IconButton className="text-white bg-black/50 p-3 rounded-full">
        //     <PlayCircleFilled fontSize="large" />
        //   </IconButton>
        // }
        onClickPreview={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        config={{
          file: {
            attributes: {
              controlsList: "nodownload noremoteplayback", 
              onContextMenu: (e) => e.preventDefault(), // Disables right-click
              disablePictureInPicture: true,
            },
          },
        }}
      />     
    </div>
  );
};

export default VideoPlayer;
