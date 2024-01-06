<template>
    <div className="gauge">
        <div className="progress">
            <div className="bar"></div>
            <div className="needle"></div>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    name: "LargeMetricGauge",
    setup()
    {

    }
})
</script>

<style>
:root {
    /* --gray: rgb(253, 251, 252);; */
    --gray: rgb(34, 48, 64);
    --blue: rgb(0, 122, 253);
    --green: rgb(6, 215, 108);
    --white: rgb(253, 251, 252);
    /* --white: rgb(34, 48, 64); */
}

.gauge {
    position: relative;
    width: 200px;
    height: 200px;
    left: 50px;
    top: 50px;
}

.progress {
    position: absolute;
    width: 100%;
    height: 100%;
    border: .1rem solid var(--white);
    border-bottom: .1rem solid var(--gray);
    border-radius: 50%;
    outline: .2rem solid var(--white);
    outline-offset: .4rem;
    overflow: hidden;
}

.progress::before {
    position: absolute;
    content: '';
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 80%;
    background-color: var(--gray);
    border-radius: 50%;
    z-index: 200;
}

.progress::after {
    position: absolute;
    content: '';
    top: 50%;
    width: 100%;
    height: 50%;
    background-color: var(--gray);
}

.bar {
    position: absolute;
    width: 50%;
    height: 100%;
    background-color: var(--green);
    transform: rotate(90deg);
    transform-origin: center right;
    animation: rotate 2s ease-in-out;
    box-shadow: 0 0 10px 10px var(--green);
}

.needle {
    position: absolute;
    width: 100%;
    height: 50%;
    background-color: var(--white) !important;
    clip-path: polygon(50% 0, 50% 0, 52% 100%, 48% 100%);
    transform: rotate(90deg);
    transform-origin: bottom center;
    animation: rotate 2s ease-in-out;
    z-index: 300;

}

@keyframes rotate {
    0% {
        background-color: var(--blue);
        transform: rotate(-90deg);
    }

    80% {
        background-color: var(--blue);
    }
}

.msg {
    margin-top: 100px;
    font: 1.3rem sans-serif;
}

.process,
.success {
    border-radius: .4rem;
    padding: .8rem 1rem;
    transform: translateY(100px);
    opacity: 0;
    transition: .4s ease-out;
}

.process {
    color: var(--white);
    border: 1.5px solid var(--white);
}

.success {
    color: var(--green);
    border: 1.5px solid var(--green);
}

.process.active {
    transform: translateY(0px);
    opacity: 1;
}

.success.active {
    transform: translateY(-52px);
    opacity: 1;
}
</style>